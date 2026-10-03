import type { Coupon, CouponDiscountType, CouponTargetType, PurchasableType } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

/**
 * In-app purchasable types a coupon can target at checkout. Installments and
 * tutor sessions are individually priced, so never. Programs (PROGRAM) are
 * targetable too, but paid offline: their code is only checked on enquiry.
 */
const CHECKOUT_TARGET_TYPES: readonly PurchasableType[] = [
  "LEARNING_PATH",
  "LEARNING_PATH_MODULE",
  "LEARNING_PATH_ITEM",
  "BUNDLE",
  "TUTOR_LMS_COURSE",
  "PRACTICE_LAB_EXAM",
];

/** Razorpay won't take an order below ₹1, so a discount never leaves less than this unless it's free. */
const RAZORPAY_MIN_PAISE = 100;

export type CouponInput = {
  code: string;
  description?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountPaise?: number | null;
  minAmountPaise?: number | null;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  isActive?: boolean;
  maxRedemptions?: number | null;
  maxPerUser?: number | null;
  targets: { targetType: CouponTargetType; targetId: string }[];
};

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

/** The discount in paise for a price, before the Razorpay minimum is applied. */
export function couponDiscountPaise(
  coupon: Pick<Coupon, "discountType" | "discountValue" | "maxDiscountPaise">,
  amountPaise: number,
): number {
  const raw =
    coupon.discountType === "FLAT"
      ? coupon.discountValue
      : Math.floor((amountPaise * Math.min(coupon.discountValue, 100)) / 100);
  const capped = coupon.maxDiscountPaise != null ? Math.min(raw, coupon.maxDiscountPaise) : raw;
  return Math.max(0, Math.min(capped, amountPaise));
}

async function findUsable(rawCode: string, targetType: CouponTargetType, targetId: string) {
  const coupon = await prisma.coupon.findUnique({ where: { code: normalizeCouponCode(rawCode) } });
  if (!coupon) throw new AppValidationError("That coupon code isn't valid.");
  checkWindow(coupon);
  const target = await prisma.couponTarget.findUnique({
    where: { couponId_targetType_targetId: { couponId: coupon.id, targetType, targetId } },
  });
  if (!target) throw new AppValidationError("This coupon doesn't apply to this item.");
  return coupon;
}

function checkWindow(coupon: Coupon) {
  const now = new Date();
  if (!coupon.isActive) throw new AppValidationError("This coupon isn't active.");
  if (coupon.startsAt && coupon.startsAt > now) throw new AppValidationError("This coupon isn't valid yet.");
  if (coupon.expiresAt && coupon.expiresAt < now) throw new AppValidationError("This coupon has expired.");
}

export const couponService = {
  list() {
    return prisma.coupon.findMany({
      include: { targets: true, _count: { select: { purchases: { where: { status: "PAID" } } } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(input: CouponInput) {
    const code = normalizeCouponCode(input.code);
    if (await prisma.coupon.findUnique({ where: { code } })) {
      throw new AppValidationError(`A coupon with code ${code} already exists.`);
    }
    const { targets, ...data } = input;
    return prisma.coupon.create({
      data: { ...data, code, targets: { create: dedupeTargets(targets) } },
    });
  },

  async update(id: string, input: Partial<CouponInput>) {
    const { targets, code, ...data } = input;
    return prisma.$transaction(async (tx) => {
      if (code !== undefined) {
        const normalized = normalizeCouponCode(code);
        const clash = await tx.coupon.findUnique({ where: { code: normalized } });
        if (clash && clash.id !== id) throw new AppValidationError(`A coupon with code ${normalized} already exists.`);
        await tx.coupon.update({ where: { id }, data: { code: normalized } });
      }
      if (targets) {
        await tx.couponTarget.deleteMany({ where: { couponId: id } });
        await tx.couponTarget.createMany({ data: dedupeTargets(targets).map((t) => ({ ...t, couponId: id })) });
      }
      const updated = await tx.coupon.update({ where: { id }, data });
      // Promo-code benefits advertising this coupon show its code and dates.
      await tx.benefit.updateMany({
        where: { couponId: id },
        data: { code: updated.code, startsAt: updated.startsAt, expiresAt: updated.expiresAt, isActive: updated.isActive },
      });
      return updated;
    });
  },

  delete(id: string) {
    // Purchases keep their amounts; their couponId is set null by the FK.
    return prisma.coupon.delete({ where: { id } });
  },

  /**
   * Checks a code against one item at its price, for one learner, and returns
   * what they'd pay. Throws AppValidationError with a learner-facing reason
   * when it doesn't apply. Uses count PAID purchases only, so two checkouts
   * racing for the last use can both succeed — acceptable at this volume.
   */
  async evaluate(
    userId: string,
    rawCode: string,
    purchasableType: PurchasableType,
    targetId: string,
    amountPaise: number,
  ): Promise<{ coupon: Coupon; originalAmountPaise: number; discountPaise: number; finalAmountPaise: number }> {
    if (!CHECKOUT_TARGET_TYPES.includes(purchasableType)) {
      throw new AppValidationError("Coupons can't be used on this kind of payment.");
    }
    const coupon = await findUsable(rawCode, purchasableType as CouponTargetType, targetId);
    if (coupon.minAmountPaise && amountPaise < coupon.minAmountPaise) {
      throw new AppValidationError(`This coupon needs a price of at least ₹${(coupon.minAmountPaise / 100).toLocaleString("en-IN")}.`);
    }

    const [totalUses, userUses] = await Promise.all([
      coupon.maxRedemptions != null
        ? prisma.purchase.count({ where: { couponId: coupon.id, status: "PAID" } })
        : Promise.resolve(0),
      coupon.maxPerUser != null
        ? prisma.purchase.count({ where: { couponId: coupon.id, status: "PAID", userId } })
        : Promise.resolve(0),
    ]);
    if (coupon.maxRedemptions != null && totalUses >= coupon.maxRedemptions) {
      throw new AppValidationError("This coupon has been fully used.");
    }
    if (coupon.maxPerUser != null && userUses >= coupon.maxPerUser) {
      throw new AppValidationError("You've already used this coupon.");
    }

    let discountPaise = couponDiscountPaise(coupon, amountPaise);
    let finalAmountPaise = amountPaise - discountPaise;
    if (finalAmountPaise > 0 && finalAmountPaise < RAZORPAY_MIN_PAISE) {
      finalAmountPaise = RAZORPAY_MIN_PAISE;
      discountPaise = amountPaise - finalAmountPaise;
    }
    return { coupon, originalAmountPaise: amountPaise, discountPaise, finalAmountPaise };
  },

  /**
   * A Program enquiry's code: valid, in its window, and targeting this
   * Program. No price or usage checks — Programs are paid offline, so staff
   * apply the discount and nothing here counts as a use.
   */
  async validateForProgram(rawCode: string, programFeedItemId: string) {
    return findUsable(rawCode, "PROGRAM", programFeedItemId);
  },

  /** Admin target picker: every item a coupon can currently be pointed at, with its price. */
  async targetOptions(): Promise<{ targetType: CouponTargetType; targetId: string; label: string }[]> {
    const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
    const [paths, modules, items, bundles, tutor, lab, programs] = await Promise.all([
      prisma.learningPath.findMany({ where: { priceInPaise: { not: null } }, select: { id: true, title: true, priceInPaise: true } }),
      prisma.learningPathModule.findMany({
        where: { priceInPaise: { not: null } },
        select: { id: true, title: true, priceInPaise: true, learningPath: { select: { title: true } } },
      }),
      prisma.learningPathItem.findMany({
        where: { priceInPaise: { not: null } },
        select: { id: true, priceInPaise: true, feedItem: { select: { title: true } }, learningPath: { select: { title: true } } },
      }),
      prisma.bundle.findMany({ where: { isActive: true }, select: { id: true, title: true, priceInPaise: true } }),
      prisma.tutorLmsCourseMapping.findMany({ select: { feedItemId: true, priceInPaise: true, feedItem: { select: { title: true } } } }),
      prisma.practiceLabExamMapping.findMany({
        where: { priceInPaise: { gt: 0 } },
        select: { feedItemId: true, priceInPaise: true, feedItem: { select: { title: true } } },
      }),
      prisma.feedItem.findMany({ where: { type: "COURSE", status: { not: "ARCHIVED" } }, select: { id: true, title: true } }),
    ]);
    return [
      ...paths.map((p) => ({ targetType: "LEARNING_PATH" as const, targetId: p.id, label: `Course: ${p.title} (${rupees(p.priceInPaise!)})` })),
      ...modules.map((m) => ({
        targetType: "LEARNING_PATH_MODULE" as const,
        targetId: m.id,
        label: `Module: ${m.learningPath.title} › ${m.title} (${rupees(m.priceInPaise!)})`,
      })),
      ...items.map((i) => ({
        targetType: "LEARNING_PATH_ITEM" as const,
        targetId: i.id,
        label: `Lesson: ${i.learningPath.title} › ${i.feedItem.title} (${rupees(i.priceInPaise!)})`,
      })),
      ...bundles.map((b) => ({ targetType: "BUNDLE" as const, targetId: b.id, label: `Bundle: ${b.title} (${rupees(b.priceInPaise)})` })),
      ...tutor.map((t) => ({
        targetType: "TUTOR_LMS_COURSE" as const,
        targetId: t.feedItemId,
        label: `LMS course: ${t.feedItem.title} (${rupees(t.priceInPaise)})`,
      })),
      ...lab.map((l) => ({
        targetType: "PRACTICE_LAB_EXAM" as const,
        targetId: l.feedItemId,
        label: `Practice Lab: ${l.feedItem.title} (${rupees(l.priceInPaise)})`,
      })),
      ...programs.map((p) => ({ targetType: "PROGRAM" as const, targetId: p.id, label: `Program (paid offline): ${p.title}` })),
    ];
  },
};

function dedupeTargets(targets: CouponInput["targets"]) {
  const seen = new Set<string>();
  return targets.filter((t) => {
    const key = `${t.targetType}:${t.targetId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
