import type { PurchasableType } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient, verifyCheckoutSignature } from "@/lib/razorpay";
import { contentAccessService } from "@/services/content-access.service";
import { tutorLmsService } from "@/services/tutor-lms.service";

export const purchaseService = {
  async createOrder(userId: string, purchasableType: PurchasableType, id: string) {
    let amountPaise: number;
    let learningPathId: string | null = null;
    let learningPathModuleId: string | null = null;
    let learningPathItemId: string | null = null;
    let bundleId: string | null = null;
    let feedItemId: string | null = null;
    let tutorSessionRequestId: string | null = null;
    let installmentId: string | null = null;

    if (purchasableType === "LEARNING_PATH") {
      const path = await prisma.learningPath.findUnique({ where: { id } });
      if (!path) throw new AppValidationError("Learning path not found");
      if (!path.priceInPaise) throw new AppValidationError("This learning path is not for sale");
      amountPaise = path.priceInPaise;
      learningPathId = path.id;
    } else if (purchasableType === "LEARNING_PATH_MODULE") {
      const learningPathModule = await prisma.learningPathModule.findUnique({ where: { id } });
      if (!learningPathModule) throw new AppValidationError("Module not found");
      if (!learningPathModule.priceInPaise) throw new AppValidationError("This module is not for sale on its own");
      amountPaise = learningPathModule.priceInPaise;
      learningPathModuleId = learningPathModule.id;
    } else if (purchasableType === "LEARNING_PATH_ITEM") {
      const item = await prisma.learningPathItem.findUnique({ where: { id } });
      if (!item) throw new AppValidationError("Lesson not found");
      if (!item.priceInPaise) throw new AppValidationError("This lesson is not for sale on its own");
      amountPaise = item.priceInPaise;
      learningPathItemId = item.id;
    } else if (purchasableType === "BUNDLE") {
      const bundle = await prisma.bundle.findUnique({ where: { id } });
      if (!bundle || !bundle.isActive) throw new AppValidationError("Bundle not found");
      amountPaise = bundle.priceInPaise;
      bundleId = bundle.id;
    } else if (purchasableType === "TUTOR_LMS_COURSE") {
      const mapping = await prisma.tutorLmsCourseMapping.findUnique({ where: { feedItemId: id } });
      if (!mapping || !mapping.isActive) throw new AppValidationError("This course is not for sale");
      amountPaise = mapping.priceInPaise;
      feedItemId = mapping.feedItemId;
    } else if (purchasableType === "INSTALLMENT") {
      const installment = await prisma.installment.findUnique({ where: { id }, include: { plan: true } });
      if (!installment || installment.plan.userId !== userId) {
        throw new AppValidationError("Installment not found");
      }
      if (installment.plan.status !== "CURRENT") throw new AppValidationError("This installment plan is no longer active");
      if (installment.status === "PAID") throw new AppValidationError("This installment is already paid");
      amountPaise = installment.amountPaise;
      installmentId = installment.id;
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
        learningPathModuleId,
        learningPathItemId,
        bundleId,
        feedItemId,
        tutorSessionRequestId,
        installmentId,
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

  /** Side effect once a Purchase is confirmed PAID: if it's a TUTOR_LMS_COURSE, enroll the student in WordPress. */
  async _grantTutorLmsAccess(userId: string, purchasableType: PurchasableType, feedItemId: string | null) {
    if (purchasableType !== "TUTOR_LMS_COURSE" || !feedItemId) return;
    await tutorLmsService.grantAccess(userId, feedItemId);
  },

  /**
   * Side effect once a Purchase is confirmed PAID: if it's settling an
   * Installment, mark it paid and complete the plan once every installment
   * in it is paid.
   */
  async _settleInstallment(purchasableType: PurchasableType, installmentId: string | null) {
    if (purchasableType !== "INSTALLMENT" || !installmentId) return;
    const installment = await prisma.installment.update({
      where: { id: installmentId },
      data: { status: "PAID", paidAt: new Date() },
      include: { plan: { include: { installments: true } } },
    });
    const allPaid = installment.plan.installments.every((i) => i.status === "PAID");
    if (allPaid) {
      await prisma.installmentPlan.update({ where: { id: installment.plan.id }, data: { status: "COMPLETED" } });
    }
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
    await purchaseService._grantTutorLmsAccess(paid.userId, paid.purchasableType, paid.feedItemId);
    await purchaseService._settleInstallment(paid.purchasableType, paid.installmentId);
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
    await purchaseService._grantTutorLmsAccess(purchase.userId, purchase.purchasableType, purchase.feedItemId);
    await purchaseService._settleInstallment(purchase.purchasableType, purchase.installmentId);
  },

  /** @deprecated Use contentAccessService.hasAccess({ type: "LEARNING_PATH", id }) directly — kept as a thin wrapper for existing call sites. */
  hasPathAccess(userId: string, pathId: string): Promise<boolean> {
    return contentAccessService.hasAccess(userId, { type: "LEARNING_PATH", id: pathId });
  },

  listMyPurchases(userId: string) {
    return prisma.purchase.findMany({
      where: { userId, status: "PAID" },
      include: {
        learningPath: true,
        learningPathModule: true,
        learningPathItem: { include: { feedItem: true } },
        bundle: {
          include: {
            items: {
              include: {
                learningPath: true,
                learningPathModule: true,
                learningPathItem: { include: { feedItem: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
