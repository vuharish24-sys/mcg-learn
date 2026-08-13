import type { Benefit, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseFeedContent } from "@/lib/feed-actions";

export const benefitService = {
  list() {
    return prisma.benefit.findMany({ orderBy: { createdAt: "desc" } });
  },

  get(id: string) {
    return prisma.benefit.findUnique({ where: { id } });
  },

  create(data: Prisma.BenefitUncheckedCreateInput) {
    return prisma.benefit.create({ data });
  },

  update(id: string, data: Prisma.BenefitUncheckedUpdateInput) {
    return prisma.benefit.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.benefit.delete({ where: { id } });
  },

  /** Active (isActive + within its start/expiry window) benefits mapped to each given variant id. */
  async getActiveForVariantIds(variantIds: string[]): Promise<Map<string, Benefit[]>> {
    if (variantIds.length === 0) return new Map();

    const mappings = await prisma.courseVariantBenefit.findMany({
      where: { variantId: { in: variantIds } },
      include: { benefit: true },
    });

    const byVariant = new Map<string, Benefit[]>();
    for (const mapping of mappings) {
      if (!isBenefitActive(mapping.benefit)) continue;
      const list = byVariant.get(mapping.variantId) ?? [];
      list.push(mapping.benefit);
      byVariant.set(mapping.variantId, list);
    }
    return byVariant;
  },

  /** Feed-item ids (courses) that have at least one active benefit mapped to any of their variants — used to show an "Offer" badge on feed cards without a per-variant lookup. */
  async getFeedItemIdsWithActiveBenefit(feedItemIds: string[]): Promise<Set<string>> {
    if (feedItemIds.length === 0) return new Set();

    const mappings = await prisma.courseVariantBenefit.findMany({
      where: { feedItemId: { in: feedItemIds } },
      include: { benefit: true },
    });

    const ids = new Set<string>();
    for (const mapping of mappings) {
      if (isBenefitActive(mapping.benefit)) ids.add(mapping.feedItemId);
    }
    return ids;
  },

  /** Replaces all benefit mappings for a course's variants with the given set — used when saving the course form. */
  async syncVariantBenefits(feedItemId: string, mappings: { variantId: string; benefitIds: string[] }[]) {
    await prisma.$transaction([
      prisma.courseVariantBenefit.deleteMany({ where: { feedItemId } }),
      prisma.courseVariantBenefit.createMany({
        data: mappings.flatMap((m) =>
          m.benefitIds.map((benefitId) => ({ feedItemId, variantId: m.variantId, benefitId })),
        ),
      }),
    ]);
  },

  /**
   * Currently-active benefits mapped to at least one course the viewer can actually see, each
   * with that visible-course count — used to render standalone promo cards in the feed. Pass
   * includeDrafts for admins only; otherwise a benefit mapped solely to unpublished courses would
   * advertise an offer non-admins can't reach and is excluded entirely.
   */
  async listActiveMappedWithCourseCounts(options: { includeDrafts?: boolean } = {}): Promise<(Benefit & { courseCount: number })[]> {
    const now = new Date();
    const benefits = await prisma.benefit.findMany({
      where: {
        isActive: true,
        variantMappings: { some: {} },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    if (benefits.length === 0) return [];

    const mappings = await prisma.courseVariantBenefit.findMany({
      where: {
        benefitId: { in: benefits.map((b) => b.id) },
        ...(options.includeDrafts ? {} : { feedItem: { status: "PUBLISHED" } }),
      },
      select: { benefitId: true, feedItemId: true },
    });
    const coursesByBenefit = new Map<string, Set<string>>();
    for (const mapping of mappings) {
      const set = coursesByBenefit.get(mapping.benefitId) ?? new Set<string>();
      set.add(mapping.feedItemId);
      coursesByBenefit.set(mapping.benefitId, set);
    }

    return benefits
      .map((benefit) => ({
        ...benefit,
        courseCount: coursesByBenefit.get(benefit.id)?.size ?? 0,
      }))
      .filter((benefit) => benefit.courseCount > 0);
  },

  /** The courses (and specific variant labels) a benefit is mapped to — powers the benefit's own detail page. */
  async getCoursesForBenefit(benefitId: string) {
    const mappings = await prisma.courseVariantBenefit.findMany({
      where: { benefitId },
      include: { feedItem: true },
    });

    const byFeedItem = new Map<string, { feedItem: (typeof mappings)[number]["feedItem"]; variantIds: string[] }>();
    for (const mapping of mappings) {
      const entry = byFeedItem.get(mapping.feedItemId) ?? { feedItem: mapping.feedItem, variantIds: [] };
      entry.variantIds.push(mapping.variantId);
      byFeedItem.set(mapping.feedItemId, entry);
    }

    return [...byFeedItem.values()].map(({ feedItem, variantIds }) => {
      const { course } = parseFeedContent(feedItem.content);
      const variantLabels = variantIds
        .map((variantId) => course?.variants.find((v) => v.id === variantId))
        .filter((v): v is NonNullable<typeof v> => !!v)
        .map((v) => (v.tier ? `${v.tier} — ${v.mode}` : v.mode));
      return { feedItem, variantLabels };
    });
  },
};

/** True while the benefit is manually active and, if set, within its start/expiry window. */
export function isBenefitActive(benefit: Pick<Benefit, "isActive" | "startsAt" | "expiresAt">) {
  if (!benefit.isActive) return false;
  const now = new Date();
  if (benefit.startsAt && benefit.startsAt > now) return false;
  if (benefit.expiresAt && benefit.expiresAt < now) return false;
  return true;
}

function parseRupees(value: string): number | null {
  const digits = value.replace(/[^\d.]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatRupees(value: number): string {
  return `₹${Math.round(Math.max(0, value)).toLocaleString("en-IN")}`;
}

/** Applies the single best discount-type benefit (largest resulting saving) to a base fee string. */
export function computeEffectivePrice(
  fee: string | undefined,
  benefits: Benefit[],
): { effectiveFee: string | null; appliedBenefit: Benefit | null } {
  const baseAmount = fee ? parseRupees(fee) : null;
  if (baseAmount === null) return { effectiveFee: null, appliedBenefit: null };

  const discountBenefits = benefits.filter(
    (b) => b.kind === "DISCOUNT_FLAT" || b.kind === "DISCOUNT_PERCENT",
  );
  if (discountBenefits.length === 0) return { effectiveFee: null, appliedBenefit: null };

  let best: { amount: number; benefit: Benefit } | null = null;
  for (const benefit of discountBenefits) {
    const discounted =
      benefit.kind === "DISCOUNT_FLAT"
        ? baseAmount - (benefit.discountAmount ?? 0)
        : baseAmount - baseAmount * ((benefit.discountPercent ?? 0) / 100);
    if (!best || discounted < best.amount) best = { amount: discounted, benefit };
  }
  if (!best) return { effectiveFee: null, appliedBenefit: null };

  return { effectiveFee: formatRupees(best.amount), appliedBenefit: best.benefit };
}
