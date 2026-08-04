import { prisma } from "@/lib/prisma";
import { learningPathService } from "@/services/learning-path.service";

export async function getDashboardData(userId: string, role: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const officerFilter = role === "CAREER_OFFICER" ? { assignedOfficerId: userId } : {};
  const includeCrm = role === "ADMIN" || role === "CAREER_OFFICER";
  const includeTrainers = role === "ADMIN" || role === "TRAINER" || role === "CAREER_OFFICER";
  const includeAds = role === "ADMIN";
  const includeLearningPaths = role === "ADMIN" || role === "LEARNER";

  const [
    todaysLeads,
    todaysFollowUps,
    openLeads,
    recentFeed,
    courses,
    trainerSummary,
    referralSummary,
    certificates,
    pendingCertificates,
    activeAds,
    myTrainerProfile,
    learnerLearningStats,
    adminLearningStats,
  ] = await Promise.all([
    includeCrm
      ? prisma.lead.count({ where: { ...officerFilter, createdAt: { gte: start, lt: end } } })
      : Promise.resolve(0),
    includeCrm
      ? prisma.lead.count({ where: { ...officerFilter, followUpAt: { gte: start, lt: end } } })
      : Promise.resolve(0),
    includeCrm
      ? prisma.lead.count({
          where: {
            ...officerFilter,
            status: { in: ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP"] },
          },
        })
      : Promise.resolve(0),
    prisma.feedItem.findMany({
      where: { status: "PUBLISHED" },
      include: { category: true },
      orderBy: { publishedAt: "desc" },
      take: 6,
    }),
    learningPathService.list({ status: "PUBLISHED", visibility: "PUBLIC" }).then((paths) => paths.slice(0, 6)),
    includeTrainers
      ? prisma.trainer.groupBy({ by: ["status"], _count: true })
      : Promise.resolve([]),
    prisma.referral.groupBy({
      by: ["status"],
      where: role === "ADMIN" ? undefined : { referrerId: userId },
      _count: true,
    }),
    prisma.certificate.count({
      where: role === "LEARNER" ? { learnerId: userId } : undefined,
    }),
    role === "ADMIN"
      ? prisma.user.count({
          where: {
            role: { key: "LEARNER" },
            certificates: { none: {} },
            isActive: true,
          },
        })
      : Promise.resolve(0),
    includeAds
      ? prisma.advertisement.count({ where: { status: "ACTIVE" } })
      : Promise.resolve(0),
    role === "TRAINER"
      ? prisma.trainer.findFirst({ where: { userId } })
      : Promise.resolve(null),
    includeLearningPaths && role === "LEARNER"
      ? learningPathService.getLearnerStats(userId)
      : Promise.resolve(null),
    includeLearningPaths && role === "ADMIN"
      ? learningPathService.getAdminStats()
      : Promise.resolve(null),
  ]);

  return {
    role,
    todaysLeads,
    todaysFollowUps,
    openLeads,
    recentFeed,
    courses,
    trainerSummary,
    referralSummary,
    certificates,
    pendingCertificates,
    activeAds,
    myTrainerProfile,
    learnerLearningStats,
    adminLearningStats,
  };
}
