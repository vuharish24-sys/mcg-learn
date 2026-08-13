import type { Prisma } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { getPathFeedItemHref } from "@/lib/feed-actions";
import { prisma } from "@/lib/prisma";
import { resolveQuizPassPercentage } from "@/lib/quiz-pass";
import { certificateService } from "@/services/certificate.service";
import { crmService } from "@/services/crm.service";

const pathInclude = {
  items: {
    include: { feedItem: { include: { category: true } } },
    orderBy: { sortOrder: "asc" as const },
  },
  requiredQuiz: true,
} satisfies Prisma.LearningPathInclude;

type PathItemInput = {
  feedItemId: string;
  sortOrder: number;
  isRequired?: boolean;
  passPercentage?: number | null;
};

async function assertRequiredQuizInPathItems(
  requiredQuizFeedItemId: string | null | undefined,
  itemFeedIds: string[],
) {
  if (!requiredQuizFeedItemId) return;

  if (!itemFeedIds.includes(requiredQuizFeedItemId)) {
    throw new AppValidationError(
      "Required quiz must be a QUIZ Feed Item already included in the Learning Path items list.",
    );
  }

  const quiz = await prisma.feedItem.findUnique({
    where: { id: requiredQuizFeedItemId },
    select: { type: true },
  });

  if (!quiz || quiz.type !== "QUIZ") {
    throw new AppValidationError("requiredQuizFeedItemId must reference a QUIZ Feed Item.");
  }
}

export const learningPathService = {
  list(filters?: { status?: string; visibility?: string; featured?: boolean; userId?: string }) {
    const where: Prisma.LearningPathWhereInput = {};
    if (filters?.status) where.status = filters.status as Prisma.EnumLearningPathStatusFilter;
    if (filters?.visibility) where.visibility = filters.visibility as Prisma.EnumLearningPathVisibilityFilter;
    if (filters?.featured) where.isFeatured = true;

    return prisma.learningPath.findMany({
      where,
      include: pathInclude,
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    });
  },

  findByIdOrSlug(idOrSlug: string) {
    return prisma.learningPath.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: pathInclude,
    });
  },

  async create(
    data: Prisma.LearningPathUncheckedCreateInput & { items?: PathItemInput[] },
  ) {
    const { items, ...pathData } = data;
    await assertRequiredQuizInPathItems(
      typeof pathData.requiredQuizFeedItemId === "string" ? pathData.requiredQuizFeedItemId : null,
      (items ?? []).map((item) => item.feedItemId),
    );

    return prisma.learningPath.create({
      data: {
        ...pathData,
        items: items?.length
          ? {
              create: items.map((item) => ({
                feedItemId: item.feedItemId,
                sortOrder: item.sortOrder,
                isRequired: item.isRequired ?? true,
                passPercentage: item.passPercentage ?? null,
              })),
            }
          : undefined,
      },
      include: pathInclude,
    });
  },

  async update(
    id: string,
    data: Prisma.LearningPathUncheckedUpdateInput & { items?: PathItemInput[] },
  ) {
    const { items, ...pathData } = data;
    const existing = await prisma.learningPath.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) throw new AppValidationError("Learning path not found");

    const itemFeedIds = items
      ? items.map((item) => item.feedItemId)
      : existing.items.map((item) => item.feedItemId);

    const requiredQuizId =
      pathData.requiredQuizFeedItemId === undefined
        ? existing.requiredQuizFeedItemId
        : pathData.requiredQuizFeedItemId === null
          ? null
          : typeof pathData.requiredQuizFeedItemId === "string"
            ? pathData.requiredQuizFeedItemId
            : existing.requiredQuizFeedItemId;

    await assertRequiredQuizInPathItems(requiredQuizId, itemFeedIds);

    return prisma.$transaction(async (tx) => {
      if (items) {
        await tx.learningPathItem.deleteMany({ where: { learningPathId: id } });
        if (items.length > 0) {
          await tx.learningPathItem.createMany({
            data: items.map((item) => ({
              learningPathId: id,
              feedItemId: item.feedItemId,
              sortOrder: item.sortOrder,
              isRequired: item.isRequired ?? true,
              passPercentage: item.passPercentage ?? null,
            })),
          });
        }
      }
      return tx.learningPath.update({
        where: { id },
        data: pathData,
        include: pathInclude,
      });
    });
  },

  delete(id: string) {
    return prisma.learningPath.delete({ where: { id } });
  },

  async startPath(userId: string, learningPathId: string) {
    const now = new Date();
    const existing = await prisma.userLearningProgress.findUnique({
      where: { userId_learningPathId: { userId, learningPathId } },
    });
    return prisma.userLearningProgress.upsert({
      where: { userId_learningPathId: { userId, learningPathId } },
      create: {
        userId,
        learningPathId,
        status: "IN_PROGRESS",
        progressPercent: 0,
        startedAt: now,
        lastActivityAt: now,
      },
      update: {
        status: existing?.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        lastActivityAt: now,
      },
    });
  },

  async markItemComplete(userId: string, learningPathId: string, feedItemId: string) {
    const path = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
      include: { items: true },
    });
    if (!path) throw new Error("Learning path not found");

    const pathItem = path.items.find((item) => item.feedItemId === feedItemId);
    if (!pathItem) throw new Error("Feed item is not part of this learning path");

    await prisma.userPathItemCompletion.upsert({
      where: { userId_learningPathId_feedItemId: { userId, learningPathId, feedItemId } },
      create: { userId, learningPathId, feedItemId },
      update: {},
    });

    const certBefore = await prisma.certificate.findUnique({
      where: { learnerId_learningPathId: { learnerId: userId, learningPathId } },
      select: { id: true },
    });

    const progress = await this.recalculateProgress(userId, learningPathId);

    let certificateJustIssued = false;
    let certificateNumber: string | null = null;
    if (!certBefore) {
      const certAfter = await prisma.certificate.findUnique({
        where: { learnerId_learningPathId: { learnerId: userId, learningPathId } },
        select: { certificateNumber: true },
      });
      if (certAfter) {
        certificateJustIssued = true;
        certificateNumber = certAfter.certificateNumber;
      }
    }

    return { progress, certificateJustIssued, certificateNumber };
  },

  async isItemComplete(
    userId: string,
    learningPathId: string,
    feedItemId: string,
    passPercentage: number,
  ) {
    const completion = await prisma.userPathItemCompletion.findUnique({
      where: { userId_learningPathId_feedItemId: { userId, learningPathId, feedItemId } },
    });
    if (completion) return true;

    const bestAttempt = await prisma.quizAttempt.findFirst({
      where: { userId, learningPathId, feedItemId, passed: true },
      orderBy: { percentage: "desc" },
    });
    if (bestAttempt) return true;

    const feedItem = await prisma.feedItem.findUnique({ where: { id: feedItemId } });
    if (feedItem?.type === "QUIZ") {
      const attempt = await prisma.quizAttempt.findFirst({
        where: { userId, learningPathId, feedItemId },
        orderBy: { percentage: "desc" },
      });
      return !!attempt && attempt.percentage >= passPercentage;
    }

    return false;
  },

  async recalculateProgress(userId: string, learningPathId: string) {
    const path = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
      include: { items: { where: { isRequired: true }, include: { feedItem: true } } },
    });
    if (!path) throw new Error("Learning path not found");

    const now = new Date();
    const requiredItems = path.items;
    let completedCount = 0;

    for (const item of requiredItems) {
      const passPct = resolveQuizPassPercentage({
        itemPassPercentage: item.passPercentage,
        pathQuizPassPercentage: path.quizPassPercentage,
      });
      const done = await this.isItemComplete(userId, learningPathId, item.feedItemId, passPct);
      if (done) completedCount += 1;
    }

    // Convenience reference only: required quiz must also be among path items (validated on write).
    let requiredQuizPassed = true;
    if (path.requiredQuizFeedItemId) {
      const alreadyCounted = requiredItems.some(
        (item) => item.feedItemId === path.requiredQuizFeedItemId,
      );
      if (!alreadyCounted) {
        requiredQuizPassed = await this.isItemComplete(
          userId,
          learningPathId,
          path.requiredQuizFeedItemId,
          resolveQuizPassPercentage({ pathQuizPassPercentage: path.quizPassPercentage }),
        );
      }
    }

    const totalRequired = requiredItems.length;
    const progressPercent = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0;
    // completedCount === totalRequired is vacuously true when totalRequired is 0
    // (a path with no required items) — guard against auto-completing that case.
    const allItemsDone = totalRequired > 0 && completedCount === totalRequired;
    const isComplete = allItemsDone && requiredQuizPassed;

    const existing = await prisma.userLearningProgress.findUnique({
      where: { userId_learningPathId: { userId, learningPathId } },
    });

    const progress = await prisma.userLearningProgress.upsert({
      where: { userId_learningPathId: { userId, learningPathId } },
      create: {
        userId,
        learningPathId,
        status: isComplete ? "COMPLETED" : completedCount > 0 ? "IN_PROGRESS" : "NOT_STARTED",
        progressPercent: isComplete ? 100 : progressPercent,
        startedAt: now,
        completedAt: isComplete ? now : null,
        lastActivityAt: now,
      },
      update: {
        status: isComplete ? "COMPLETED" : "IN_PROGRESS",
        progressPercent: isComplete ? 100 : progressPercent,
        lastActivityAt: now,
        completedAt: isComplete ? now : existing?.completedAt ?? null,
      },
    });

    if (isComplete) {
      await this.issueCertificateIfNeeded(userId, learningPathId, path.title);
    }

    return progress;
  },

  async issueCertificateIfNeeded(userId: string, learningPathId: string, pathTitle: string) {
    const existing = await prisma.certificate.findUnique({
      where: { learnerId_learningPathId: { learnerId: userId, learningPathId } },
    });
    if (existing) return existing;

    const learner = await prisma.user.findUnique({ where: { id: userId } });
    if (!learner) return null;

    const certificate = await certificateService.create({
      learnerId: userId,
      learningPathId,
      courseName: pathTitle,
      learnerName: learner.fullName,
      issueDate: new Date(),
    });

    // Best-effort CRM handoff signal — must never block certificate issuance.
    if (learner.email) {
      crmService.flagLearnerCertified(learner.email, pathTitle).catch((error) => {
        console.error("flagLearnerCertified failed", error);
      });
    }

    return certificate;
  },

  async getContinueHref(userId: string, learningPathId: string) {
    const detail = await this.getPathWithUserProgress(learningPathId, userId);
    if (!detail) return null;

    const next = detail.itemsWithStatus.find((item) => !item.isComplete);
    if (!next) return `/learning-paths/${detail.path.slug}`;

    return getPathFeedItemHref(next.feedItem.id, next.feedItem.type, learningPathId);
  },

  async getMyLearning(userId: string) {
    const [inProgress, completed, recommended] = await Promise.all([
      prisma.userLearningProgress.findMany({
        where: { userId, status: "IN_PROGRESS" },
        include: { learningPath: { include: pathInclude } },
        orderBy: { lastActivityAt: "desc" },
      }),
      prisma.userLearningProgress.findMany({
        where: { userId, status: "COMPLETED" },
        include: { learningPath: { include: pathInclude } },
        orderBy: { completedAt: "desc" },
      }),
      prisma.learningPath.findMany({
        where: {
          status: "PUBLISHED",
          visibility: "PUBLIC",
          progress: { none: { userId, status: { in: ["IN_PROGRESS", "COMPLETED"] } } },
        },
        include: pathInclude,
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        take: 6,
      }),
    ]);

    const inProgressWithContinue = await Promise.all(
      inProgress.map(async (row) => ({
        ...row,
        continueHref: await this.getContinueHref(userId, row.learningPathId),
      })),
    );

    return { inProgress: inProgressWithContinue, completed, recommended };
  },

  async getPathWithUserProgress(learningPathId: string, userId: string) {
    const path = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
      include: pathInclude,
    });
    if (!path) return null;

    const [progress, completions, attempts] = await Promise.all([
      prisma.userLearningProgress.findUnique({
        where: { userId_learningPathId: { userId, learningPathId } },
      }),
      prisma.userPathItemCompletion.findMany({ where: { userId, learningPathId } }),
      prisma.quizAttempt.findMany({
        where: { userId, learningPathId },
        orderBy: { percentage: "desc" },
      }),
    ]);

    const completionSet = new Set(completions.map((c) => c.feedItemId));
    const bestAttempts = new Map<string, number>();
    for (const attempt of attempts) {
      const current = bestAttempts.get(attempt.feedItemId) ?? 0;
      if (attempt.percentage > current) bestAttempts.set(attempt.feedItemId, attempt.percentage);
    }

    const itemsWithStatus = await Promise.all(
      path.items.map(async (item) => {
        const passPct = resolveQuizPassPercentage({
          itemPassPercentage: item.passPercentage,
          pathQuizPassPercentage: path.quizPassPercentage,
        });
        const isComplete = await this.isItemComplete(
          userId,
          learningPathId,
          item.feedItemId,
          passPct,
        );
        return {
          ...item,
          isComplete,
          bestScore: bestAttempts.get(item.feedItemId) ?? null,
          manuallyCompleted: completionSet.has(item.feedItemId),
        };
      }),
    );

    return { path, progress, itemsWithStatus };
  },

  async getAdminStats() {
    const [
      totalPaths,
      publishedPaths,
      certificatesIssued,
      totalProgress,
      completedProgress,
      quizAttempts,
      passedAttempts,
      popularPath,
    ] = await Promise.all([
      prisma.learningPath.count(),
      prisma.learningPath.count({ where: { status: "PUBLISHED" } }),
      prisma.certificate.count({ where: { learningPathId: { not: null } } }),
      prisma.userLearningProgress.count(),
      prisma.userLearningProgress.count({ where: { status: "COMPLETED" } }),
      prisma.quizAttempt.count(),
      prisma.quizAttempt.count({ where: { passed: true } }),
      prisma.userLearningProgress.groupBy({
        by: ["learningPathId"],
        _count: true,
        orderBy: { _count: { learningPathId: "desc" } },
        take: 1,
      }),
    ]);

    let mostPopularPath = null;
    if (popularPath.length > 0) {
      mostPopularPath = await prisma.learningPath.findUnique({
        where: { id: popularPath[0].learningPathId },
        select: { id: true, title: true, slug: true, _count: { select: { progress: true } } },
      });
    }

    return {
      totalPaths,
      publishedPaths,
      certificatesIssued,
      completionRate: totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0,
      quizPassRate: quizAttempts > 0 ? Math.round((passedAttempts / quizAttempts) * 100) : 0,
      mostPopularPath,
    };
  },

  async getLearnerStats(userId: string) {
    const [pathsInProgress, pathsCompleted, certificates, quizAttempts, passedAttempts, continueLearning] =
      await Promise.all([
        prisma.userLearningProgress.count({ where: { userId, status: "IN_PROGRESS" } }),
        prisma.userLearningProgress.count({ where: { userId, status: "COMPLETED" } }),
        prisma.certificate.count({ where: { learnerId: userId } }),
        prisma.quizAttempt.findMany({
          where: { userId },
          select: { percentage: true, passed: true },
        }),
        prisma.quizAttempt.count({ where: { userId, passed: true } }),
        this.getContinueLearning(userId),
      ]);

    const avgQuizScore =
      quizAttempts.length > 0
        ? Math.round(quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length)
        : 0;

    return {
      pathsInProgress,
      pathsCompleted,
      certificates,
      avgQuizScore,
      quizPassRate:
        quizAttempts.length > 0
          ? Math.round((passedAttempts / quizAttempts.length) * 100)
          : 0,
      continueLearning,
    };
  },

  /** In-progress paths for this learner, most recently active first — used on the dashboard and interleaved into /feed. */
  async getContinueLearning(userId: string, take = 3) {
    const rows = await prisma.userLearningProgress.findMany({
      where: { userId, status: "IN_PROGRESS" },
      include: { learningPath: { include: pathInclude } },
      orderBy: { lastActivityAt: "desc" },
      take,
    });

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        continueHref: await this.getContinueHref(userId, row.learningPathId),
      })),
    );
  },

  /** Published/public paths this learner hasn't touched yet, featured first — for feed/dashboard recommendations. */
  async getRecommended(userId: string, take = 4) {
    const touchedPathIds = await prisma.userLearningProgress.findMany({
      where: { userId },
      select: { learningPathId: true },
    });
    const excludeIds = touchedPathIds.map((row) => row.learningPathId);

    return prisma.learningPath.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
        ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
      },
      include: pathInclude,
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take,
    });
  },
};
