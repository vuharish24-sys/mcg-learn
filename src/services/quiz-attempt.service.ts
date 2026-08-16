import { AppValidationError } from "@/lib/api";
import { parseFeedContent } from "@/lib/feed-actions";
import { prisma } from "@/lib/prisma";
import { resolveQuizPassPercentage } from "@/lib/quiz-pass";
import { learningPathService } from "@/services/learning-path.service";

export const quizAttemptService = {
  async recordAttempt(input: {
    userId: string;
    feedItemId: string;
    learningPathId?: string | null;
    /** Selected option index per question index (question index as string key). */
    answers: Record<string, number>;
  }) {
    const feedItem = await prisma.feedItem.findUnique({ where: { id: input.feedItemId } });
    if (!feedItem || feedItem.type !== "QUIZ") {
      throw new AppValidationError("Quiz not found");
    }

    const questions = parseFeedContent(feedItem.content).questions ?? [];
    const gradedIndexes = questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => typeof question.answer === "number");

    if (gradedIndexes.length === 0) {
      throw new AppValidationError("This quiz has no graded questions to record");
    }

    const answerKey: Record<number, number> = {};
    let score = 0;
    for (const { question, index } of gradedIndexes) {
      answerKey[index] = question.answer as number;
      if (input.answers[String(index)] === question.answer) score += 1;
    }
    const totalQuestions = gradedIndexes.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    const path = input.learningPathId
      ? await prisma.learningPath.findUnique({
          where: { id: input.learningPathId },
          include: { items: true },
        })
      : null;

    let passThreshold = 60;
    if (path) {
      const pathItem = path.items.find((item) => item.feedItemId === input.feedItemId);
      passThreshold = resolveQuizPassPercentage({
        itemPassPercentage: pathItem?.passPercentage,
        pathQuizPassPercentage: path.quizPassPercentage,
      });
    }

    const passed = percentage >= passThreshold;
    const now = new Date();

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: input.userId,
        feedItemId: input.feedItemId,
        learningPathId: input.learningPathId ?? null,
        score,
        totalQuestions,
        percentage,
        passed,
        startedAt: now,
        completedAt: now,
      },
    });

    let certificateJustIssued = false;
    let certificateNumber: string | null = null;
    let badgeJustIssued = false;
    let badgeIcon: string | null = null;

    if (passed && input.learningPathId) {
      const learningPathId = input.learningPathId;
      const rewardType = path?.rewardType ?? "CERTIFICATE";

      await prisma.userPathItemCompletion.upsert({
        where: {
          userId_learningPathId_feedItemId: {
            userId: input.userId,
            learningPathId,
            feedItemId: input.feedItemId,
          },
        },
        create: {
          userId: input.userId,
          learningPathId,
          feedItemId: input.feedItemId,
        },
        update: {},
      });

      const certBefore =
        rewardType === "CERTIFICATE"
          ? await prisma.certificate.findUnique({
              where: { learnerId_learningPathId: { learnerId: input.userId, learningPathId } },
              select: { id: true },
            })
          : null;
      const badgeBefore =
        rewardType === "BADGE"
          ? await prisma.badge.findUnique({
              where: { learnerId_learningPathId: { learnerId: input.userId, learningPathId } },
              select: { id: true },
            })
          : null;

      await learningPathService.recalculateProgress(input.userId, learningPathId);

      if (rewardType === "CERTIFICATE" && !certBefore) {
        const certAfter = await prisma.certificate.findUnique({
          where: { learnerId_learningPathId: { learnerId: input.userId, learningPathId } },
          select: { certificateNumber: true },
        });
        if (certAfter) {
          certificateJustIssued = true;
          certificateNumber = certAfter.certificateNumber;
        }
      }
      if (rewardType === "BADGE" && !badgeBefore) {
        const badgeAfter = await prisma.badge.findUnique({
          where: { learnerId_learningPathId: { learnerId: input.userId, learningPathId } },
          select: { icon: true },
        });
        if (badgeAfter) {
          badgeJustIssued = true;
          badgeIcon = badgeAfter.icon;
        }
      }
    }

    const bestAttempt = await prisma.quizAttempt.findFirst({
      where: {
        userId: input.userId,
        feedItemId: input.feedItemId,
        learningPathId: input.learningPathId ?? null,
      },
      orderBy: { percentage: "desc" },
    });

    return {
      attempt,
      passed,
      passThreshold,
      bestScore: bestAttempt?.percentage ?? percentage,
      // Safe to reveal now that the attempt is graded and recorded.
      answerKey,
      certificateJustIssued,
      certificateNumber,
      badgeJustIssued,
      badgeIcon,
    };
  },

  getBestAttempt(userId: string, feedItemId: string, learningPathId?: string | null) {
    return prisma.quizAttempt.findFirst({
      where: {
        userId,
        feedItemId,
        learningPathId: learningPathId ?? undefined,
      },
      orderBy: { percentage: "desc" },
    });
  },
};
