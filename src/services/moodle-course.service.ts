import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const moodleCourseService = {
  getMapping(feedItemId: string) {
    return prisma.moodleCourseMapping.findUnique({ where: { feedItemId } });
  },

  async upsertMapping(
    feedItemId: string,
    input: {
      moodleCourseId: number;
      moodleCourseIdNumber?: string | null;
      targetLinkUri?: string | null;
      ltiCustomParams?: string | null;
      priceInPaise: number;
      isActive?: boolean;
    },
  ) {
    const feedItem = await prisma.feedItem.findUnique({ where: { id: feedItemId } });
    if (!feedItem || feedItem.type !== "MOODLE_COURSE") {
      throw new AppValidationError("Feed item not found or not a Moodle course");
    }
    const data = {
      moodleCourseId: input.moodleCourseId,
      moodleCourseIdNumber: input.moodleCourseIdNumber || null,
      targetLinkUri: input.targetLinkUri || null,
      ltiCustomParams: input.ltiCustomParams || null,
      priceInPaise: input.priceInPaise,
      isActive: input.isActive ?? true,
    };
    return prisma.moodleCourseMapping.upsert({
      where: { feedItemId },
      create: { feedItemId, ...data },
      update: data,
    });
  },

  listAllMapped() {
    return prisma.moodleCourseMapping.findMany({
      include: { feedItem: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async hasAccess(userId: string, feedItemId: string): Promise<boolean> {
    const purchase = await prisma.purchase.findFirst({
      where: { userId, status: "PAID", purchasableType: "MOODLE_COURSE", feedItemId },
      select: { id: true },
    });
    return Boolean(purchase);
  },
};
