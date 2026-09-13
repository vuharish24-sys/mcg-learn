import type { PurchasableType } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient, verifyCheckoutSignature } from "@/lib/razorpay";

export const purchaseService = {
  async createOrder(userId: string, purchasableType: PurchasableType, id: string) {
    let amountPaise: number;
    let learningPathId: string | null = null;
    let bundleId: string | null = null;
    let feedItemId: string | null = null;
    let tutorSessionRequestId: string | null = null;

    if (purchasableType === "LEARNING_PATH") {
      const path = await prisma.learningPath.findUnique({ where: { id } });
      if (!path) throw new AppValidationError("Learning path not found");
      if (!path.priceInPaise) throw new AppValidationError("This learning path is not for sale");
      amountPaise = path.priceInPaise;
      learningPathId = path.id;
    } else if (purchasableType === "BUNDLE") {
      const bundle = await prisma.bundle.findUnique({ where: { id } });
      if (!bundle || !bundle.isActive) throw new AppValidationError("Bundle not found");
      amountPaise = bundle.priceInPaise;
      bundleId = bundle.id;
    } else if (purchasableType === "MOODLE_COURSE") {
      const mapping = await prisma.moodleCourseMapping.findUnique({ where: { feedItemId: id } });
      if (!mapping || !mapping.isActive) throw new AppValidationError("This course is not for sale");
      amountPaise = mapping.priceInPaise;
      feedItemId = mapping.feedItemId;
    } else {
      const request = await prisma.tutorSessionRequest.findUnique({ where: { id } });
      if (!request || request.studentId !== userId) throw new AppValidationError("Session request not found");
      if (request.status !== "PRICED" || !request.priceAmountPaise) {
        throw new AppValidationError("This session hasn't been priced yet");
      }
      amountPaise = request.priceAmountPaise;
      tutorSessionRequestId = request.id;
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) throw new AppValidationError("Payments are not configured yet — contact the site admin.");

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `${purchasableType.toLowerCase()}_${id}_${Date.now()}`.slice(0, 40),
    });

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        purchasableType,
        learningPathId,
        bundleId,
        feedItemId,
        tutorSessionRequestId,
        amountPaise,
        razorpayOrderId: order.id,
      },
    });

    return {
      purchaseId: purchase.id,
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null,
    };
  },

  /** Side effect once a Purchase is confirmed PAID: if it's paying for a tutor session, move that request to CONFIRMED. */
  async _confirmLinkedTutorSession(tutorSessionRequestId: string | null) {
    if (!tutorSessionRequestId) return;
    const request = await prisma.tutorSessionRequest.findUnique({ where: { id: tutorSessionRequestId } });
    if (!request || request.status === "CONFIRMED") return;
    await prisma.tutorSessionRequest.update({
      where: { id: tutorSessionRequestId },
      data: { status: "CONFIRMED", scheduledAt: request.preferredAt },
    });
  },

  /** Called from the client immediately after Razorpay's checkout succeeds. */
  async verifyPayment(
    userId: string,
    input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    const purchase = await prisma.purchase.findUnique({ where: { razorpayOrderId: input.razorpayOrderId } });
    if (!purchase) throw new AppValidationError("Purchase not found");
    if (purchase.userId !== userId) throw new AppValidationError("Not authorized");
    if (purchase.status === "PAID") return purchase; // already confirmed, e.g. by the webhook

    const valid = verifyCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature);
    if (!valid) {
      await prisma.purchase.update({ where: { id: purchase.id }, data: { status: "FAILED" } });
      throw new AppValidationError("Payment verification failed");
    }

    const paid = await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: "PAID", razorpayPaymentId: input.razorpayPaymentId },
    });
    await purchaseService._confirmLinkedTutorSession(paid.tutorSessionRequestId);
    return paid;
  },

  /**
   * Called by the Razorpay webhook (payment.captured) — the source of truth
   * if a learner closes the tab before the client-side verify call fires.
   * Caller must have already verified the webhook signature. Idempotent.
   */
  async markPaidFromWebhook(razorpayOrderId: string, razorpayPaymentId: string) {
    const purchase = await prisma.purchase.findUnique({ where: { razorpayOrderId } });
    if (!purchase || purchase.status === "PAID") return;
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { status: "PAID", razorpayPaymentId },
    });
    await purchaseService._confirmLinkedTutorSession(purchase.tutorSessionRequestId);
  },

  async hasPathAccess(userId: string, pathId: string): Promise<boolean> {
    const path = await prisma.learningPath.findUnique({ where: { id: pathId }, select: { priceInPaise: true } });
    if (!path) return false;
    if (!path.priceInPaise) return true;

    const direct = await prisma.purchase.findFirst({
      where: { userId, status: "PAID", purchasableType: "LEARNING_PATH", learningPathId: pathId },
      select: { id: true },
    });
    if (direct) return true;

    const viaBundle = await prisma.purchase.findFirst({
      where: {
        userId,
        status: "PAID",
        purchasableType: "BUNDLE",
        bundle: { paths: { some: { learningPathId: pathId } } },
      },
      select: { id: true },
    });
    return Boolean(viaBundle);
  },

  listMyPurchases(userId: string) {
    return prisma.purchase.findMany({
      where: { userId, status: "PAID" },
      include: {
        learningPath: true,
        bundle: { include: { paths: { include: { learningPath: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
