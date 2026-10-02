import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { enrolLearner, PracticeLabApiError, type PracticeLabGrant } from "@/lib/practice-lab";

type Mapping = { grantKind: string; examId: string | null; programCode: string | null };

function grantFor(mapping: Mapping, ref: string): PracticeLabGrant {
  if (mapping.grantKind === "exam") {
    if (!mapping.examId) throw new Error("Exam mapping is missing its exam ID");
    return { kind: "exam", exam: mapping.examId, ref };
  }
  if (!mapping.programCode) throw new Error("Program-practice mapping is missing its program code");
  return { kind: "program_practice", program: mapping.programCode, ref };
}

function launchPathFor(mapping: Mapping | null): `/${string}` {
  if (mapping?.grantKind === "exam" && mapping.examId) return `/launch/exam/${encodeURIComponent(mapping.examId)}`;
  if (mapping?.grantKind === "program_practice" && mapping.programCode) {
    return `/launch/practice/${encodeURIComponent(mapping.programCode)}`;
  }
  return "/dashboard";
}

export const practiceLabService = {
  getMapping(feedItemId: string) {
    return prisma.practiceLabExamMapping.findUnique({ where: { feedItemId } });
  },

  async upsertMapping(
    feedItemId: string,
    input: {
      grantKind: "exam" | "program_practice";
      examId?: string | null;
      programCode?: string | null;
      priceInPaise: number;
      isActive?: boolean;
    },
  ) {
    const feedItem = await prisma.feedItem.findUnique({ where: { id: feedItemId } });
    if (!feedItem || feedItem.type !== "PRACTICE_LAB_EXAM") {
      throw new AppValidationError("Feed item not found or not a Practice Lab exam");
    }
    if (input.grantKind === "exam" && !input.examId) {
      throw new AppValidationError("Exam ID is required for an exam grant");
    }
    if (input.grantKind === "program_practice" && !input.programCode) {
      throw new AppValidationError("Program code is required for a program-practice grant");
    }
    const data = {
      grantKind: input.grantKind,
      examId: input.grantKind === "exam" ? (input.examId as string) : null,
      programCode: input.grantKind === "program_practice" ? (input.programCode as string) : null,
      priceInPaise: input.priceInPaise,
      isActive: input.isActive ?? true,
    };
    return prisma.practiceLabExamMapping.upsert({
      where: { feedItemId },
      create: { feedItemId, ...data },
      update: data,
    });
  },

  listAllMapped() {
    return prisma.practiceLabExamMapping.findMany({
      include: { feedItem: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async hasAccess(userId: string, feedItemId: string): Promise<boolean> {
    const purchase = await prisma.purchase.findFirst({
      where: { userId, status: "PAID", purchasableType: "PRACTICE_LAB_EXAM", feedItemId },
      select: { id: true },
    });
    return Boolean(purchase);
  },

  /**
   * Called once a Purchase for a PRACTICE_LAB_EXAM is confirmed PAID —
   * grants the mapped entitlement to the learner on the Practice Lab,
   * matched by external_ref = our own user id (the Practice Lab finds or
   * creates the learner itself, so no remote id needs to be stored back on
   * User, unlike the WordPress integration). The grant carries the Purchase
   * id as its `ref`, so a retry can never double-grant. Deliberately doesn't
   * throw: a Practice Lab outage shouldn't fail payment confirmation.
   */
  async grantAccess(userId: string, feedItemId: string, purchaseId: string): Promise<void> {
    try {
      const [user, mapping] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.practiceLabExamMapping.findUnique({ where: { feedItemId } }),
      ]);
      if (!user || !mapping) return;

      await enrolLearner(
        { external_ref: user.id, name: user.fullName, email: user.email, phone: user.phone ?? undefined },
        [grantFor(mapping, purchaseId)],
      );
    } catch (error) {
      console.error("practiceLabService.grantAccess failed", error);
    }
  },

  /**
   * Returns a one-time sign-in URL that drops the student straight into the
   * mapped exam or practice drill. Re-sends the purchase's grant with the
   * same `ref` — a no-op on the Lab when it already exists, but it heals a
   * grant that failed at payment time (grantAccess only logs failures).
   */
  async getLaunchUrl(userId: string, feedItemId: string): Promise<string> {
    const [user, mapping, purchase] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.practiceLabExamMapping.findUnique({ where: { feedItemId } }),
      prisma.purchase.findFirst({
        where: { userId, status: "PAID", purchasableType: "PRACTICE_LAB_EXAM", feedItemId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      }),
    ]);
    if (!user) throw new AppValidationError("User not found");

    let result;
    try {
      result = await enrolLearner(
        { external_ref: user.id, name: user.fullName, email: user.email, phone: user.phone ?? undefined },
        mapping && purchase ? [grantFor(mapping, purchase.id)] : undefined,
        { redirect_to: launchPathFor(mapping), ttl_sec: 3600 },
      );
    } catch (error) {
      if (error instanceof PracticeLabApiError && error.status === 409) {
        throw new AppValidationError(
          "Your email or phone belongs to a Practice Lab staff account, so it can't be used as a learner — contact the site admin.",
        );
      }
      throw error;
    }
    if (typeof result.handoff_url !== "string") {
      throw new AppValidationError("Unable to set up your Practice Lab access — contact the site admin.");
    }
    return result.handoff_url;
  },
};
