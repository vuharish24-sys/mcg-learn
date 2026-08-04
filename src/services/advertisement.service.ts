import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const advertisementService = {
  list() {
    return prisma.advertisement.findMany({
      include: { feedItem: { select: { title: true, type: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  },
  create(data: Prisma.AdvertisementUncheckedCreateInput) {
    return prisma.advertisement.create({ data });
  },
  async recordImpressions(advertisementIds: string[]) {
    const uniqueIds = [...new Set(advertisementIds.filter(Boolean))];
    if (uniqueIds.length === 0) return { recorded: 0 };
    const now = new Date();
    const eligible = await prisma.advertisement.findMany({
      where: {
        id: { in: uniqueIds },
        status: "ACTIVE",
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      select: { id: true },
    });
    if (eligible.length === 0) return { recorded: 0 };
    const result = await prisma.advertisement.updateMany({
      where: { id: { in: eligible.map((item) => item.id) } },
      data: { impressions: { increment: 1 } },
    });
    return { recorded: result.count };
  },
  recordClick(advertisementId: string) {
    const now = new Date();
    return prisma.advertisement.updateMany({
      where: {
        id: advertisementId,
        status: "ACTIVE",
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      data: { clicks: { increment: 1 } },
    });
  },
};
