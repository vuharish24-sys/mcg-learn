import { AppValidationError } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { contentAccessService } from "@/services/content-access.service";
import { enrolLearner, listLearnerAttempts, PracticeLabApiError, type PracticeLabAttempt, type PracticeLabGrant } from "@/lib/practice-lab";
import { learningPathService } from "@/services/learning-path.service";

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

/** Whether an attempt satisfies a course item's completion rule for this mapping. */
export function attemptCompletes(
  attempt: PracticeLabAttempt,
  mapping: Mapping,
  rule: "ON_PASS" | "ON_FINISH",
  passPercentage: number | null,
): boolean {
  const matches =
    mapping.grantKind === "exam"
      ? attempt.exam?.id === mapping.examId
      : attempt.exam === null && attempt.program === mapping.programCode;
  if (!matches) return false;
  // Older webhook payloads carry no status; a score means it was graded.
  const graded = attempt.status ? attempt.status === "graded" : attempt.counted_pct !== null;
  if (!graded) return false;
  if (rule === "ON_FINISH") return true;
  // A set Pass % wins; otherwise the Lab's own verdict. Drills have no
  // verdict (passed is null), so on-pass for a drill needs a Pass %.
  if (passPercentage !== null) return (attempt.counted_pct ?? 0) >= passPercentage;
  return attempt.passed === true;
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

  /**
   * How (if at all) the learner may use this Practice Lab item, and the grant
   * `ref` that access is issued under on the Lab. In order of preference:
   *   - "purchase": their own PAID purchase of the item (ref = Purchase id);
   *   - "course": the item sits in a published course with lab access
   *     INCLUDED, and they have access to that lesson of the course — free
   *     course, or bought course/module/lesson/bundle/installment
   *     (ref = path_<courseId>_<itemId>, stable across course edits);
   *   - "free": the item itself is priced at ₹0 (ref = free_<itemId>).
   * Refs keep grants idempotent on the Lab: the same ref never issues twice.
   */
  async resolveAccess(
    userId: string,
    feedItemId: string,
  ): Promise<{ via: "purchase" | "course" | "free"; ref: string; courseTitle?: string } | null> {
    const purchase = await prisma.purchase.findFirst({
      where: { userId, status: "PAID", purchasableType: "PRACTICE_LAB_EXAM", feedItemId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (purchase) return { via: "purchase", ref: purchase.id };

    const pathItems = await prisma.learningPathItem.findMany({
      where: { feedItemId, labAccessMode: "INCLUDED", learningPath: { status: "PUBLISHED" } },
      select: { id: true, learningPath: { select: { id: true, title: true } } },
    });
    for (const pathItem of pathItems) {
      if (await contentAccessService.hasAccess(userId, { type: "LEARNING_PATH_ITEM", id: pathItem.id })) {
        return {
          via: "course",
          ref: `path_${pathItem.learningPath.id}_${feedItemId}`,
          courseTitle: pathItem.learningPath.title,
        };
      }
    }

    const mapping = await prisma.practiceLabExamMapping.findUnique({ where: { feedItemId } });
    if (mapping?.isActive && mapping.priceInPaise === 0) return { via: "free", ref: `free_${feedItemId}` };
    return null;
  },

  async hasAccess(userId: string, feedItemId: string): Promise<boolean> {
    return Boolean(await practiceLabService.resolveAccess(userId, feedItemId));
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
   * mapped exam or practice drill. Sends the learner's grant under the ref
   * from resolveAccess — a no-op on the Lab when it already exists. That's
   * how course-included and free access get granted at all (there's no
   * payment event for them), and it heals a purchase grant that failed at
   * payment time (grantAccess only logs failures).
   */
  async getLaunchUrl(userId: string, feedItemId: string, returnPath?: string): Promise<string> {
    const [user, mapping, access] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.practiceLabExamMapping.findUnique({ where: { feedItemId } }),
      practiceLabService.resolveAccess(userId, feedItemId),
    ]);
    if (!user) throw new AppValidationError("User not found");

    let result;
    try {
      result = await enrolLearner(
        { external_ref: user.id, name: user.fullName, email: user.email, phone: user.phone ?? undefined },
        mapping && access ? [grantFor(mapping, access.ref)] : undefined,
        {
          redirect_to: launchPathFor(mapping),
          ttl_sec: 3600,
          // The Lab only accepts https on an allowlisted host, so a local
          // http dev server sends none.
          ...(returnPath && appUrl().startsWith("https://") ? { return_to: `${appUrl()}${returnPath}` } : {}),
        },
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

  /**
   * Marks Practice Lab lessons complete in the learner's courses when a Lab
   * attempt meets the lesson's rule (on pass / on finish). Called when the
   * learner views the exercise or course page, and from the Lab's
   * attempt.completed webhook. Idempotent. `attempts` lets the webhook pass
   * the attempt it just received instead of re-fetching. Never throws: a Lab
   * hiccup must not break the page that called it.
   */
  async syncCompletions(
    userId: string,
    options: { feedItemId?: string; learningPathId?: string; attempts?: PracticeLabAttempt[] } = {},
  ): Promise<number> {
    try {
      const pathItems = await prisma.learningPathItem.findMany({
        where: {
          labCompletionRule: { in: ["ON_PASS", "ON_FINISH"] },
          feedItem: { type: "PRACTICE_LAB_EXAM" },
          ...(options.feedItemId ? { feedItemId: options.feedItemId } : {}),
          ...(options.learningPathId ? { learningPathId: options.learningPathId } : {}),
        },
        select: { id: true, learningPathId: true, feedItemId: true, labCompletionRule: true, passPercentage: true },
      });
      if (pathItems.length === 0) return 0;

      const done = await prisma.userPathItemCompletion.findMany({
        where: { userId, OR: pathItems.map((item) => ({ learningPathId: item.learningPathId, feedItemId: item.feedItemId })) },
        select: { learningPathId: true, feedItemId: true },
      });
      const doneKeys = new Set(done.map((row) => `${row.learningPathId}:${row.feedItemId}`));
      const pending = pathItems.filter((item) => !doneKeys.has(`${item.learningPathId}:${item.feedItemId}`));
      if (pending.length === 0) return 0;

      const mappings = await prisma.practiceLabExamMapping.findMany({
        where: { feedItemId: { in: [...new Set(pending.map((item) => item.feedItemId))] } },
      });
      const mappingByFeedItem = new Map(mappings.map((mapping) => [mapping.feedItemId, mapping]));

      // Only a lesson the learner can actually use can be completed.
      let attempts = options.attempts;
      let completed = 0;
      for (const item of pending) {
        const mapping = mappingByFeedItem.get(item.feedItemId);
        if (!mapping || item.labCompletionRule === "MANUAL") continue;
        if (!(await practiceLabService.hasAccess(userId, item.feedItemId))) continue;
        attempts ??= await listLearnerAttempts(userId);
        const qualifies = attempts.some((attempt) =>
          attemptCompletes(attempt, mapping, item.labCompletionRule as "ON_PASS" | "ON_FINISH", item.passPercentage),
        );
        if (!qualifies) continue;
        await learningPathService.markItemComplete(userId, item.learningPathId, item.feedItemId, "system");
        completed += 1;
      }
      return completed;
    } catch (error) {
      console.error("practiceLabService.syncCompletions failed", error);
      return 0;
    }
  },
};
