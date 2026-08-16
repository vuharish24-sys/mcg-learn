import { prisma } from "@/lib/prisma";

export const badgeService = {
  listAchievements(learnerId: string) {
    return prisma.badge.findMany({
      where: { learnerId },
      include: { learningPath: { select: { title: true, slug: true, thumbnailUrl: true } } },
      orderBy: { issuedAt: "desc" },
    });
  },
};
