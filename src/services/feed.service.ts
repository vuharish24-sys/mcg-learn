import { FeedType, type FeedPlacement, type Prisma } from "@prisma/client";
import { fetchLinkPreview } from "@/lib/link-preview";
import { prisma } from "@/lib/prisma";

export type FeedQuery = {
  search?: string;
  category?: string;
  type?: string;
  sort?: "latest" | "popular";
  featured?: boolean;
  includeDrafts?: boolean;
  /** Restrict to items opted into this placement. Omit to skip placement filtering (e.g. admin management views). */
  placement?: FeedPlacement;
};

async function previewFieldsForUrl(
  externalUrl: string | null | undefined,
  existingThumbnail?: string | null,
) {
  if (!externalUrl) {
    return {
      previewTitle: null,
      previewDescription: null,
      previewImageUrl: null,
      previewSiteName: null,
      previewFetchedAt: null,
      thumbnailUrl: existingThumbnail ?? null,
    };
  }

  const preview = await fetchLinkPreview(externalUrl);
  if (!preview) {
    return {
      previewTitle: null,
      previewDescription: null,
      previewImageUrl: null,
      previewSiteName: null,
      previewFetchedAt: new Date(),
      thumbnailUrl: existingThumbnail ?? null,
    };
  }

  return {
    previewTitle: preview.title ? preview.title.slice(0, 300) : null,
    previewDescription: preview.description ? preview.description.slice(0, 500) : null,
    previewImageUrl: preview.imageUrl,
    previewSiteName: preview.siteName,
    previewFetchedAt: new Date(),
    thumbnailUrl: existingThumbnail || preview.imageUrl || null,
  };
}

export const feedService = {
  list(query: FeedQuery = {}) {
    const where: Prisma.FeedItemWhereInput = {
      ...(query.includeDrafts ? {} : { status: "PUBLISHED" }),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.type ? { type: query.type as FeedType } : {}),
      ...(query.featured ? { isFeatured: true } : {}),
      ...(query.placement ? { placements: { has: query.placement } } : {}),
    };

    return prisma.feedItem.findMany({
      where,
      include: { category: true, advertisement: true },
      orderBy:
        query.sort === "popular"
          ? [{ viewCount: "desc" }, { publishedAt: "desc" }]
          : [{ priority: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
  },

  /**
   * Published ad/promo items opted into a placement outside the main feed
   * (e.g. the learning paths list). Schedule-aware: an item linked to an
   * Advertisement only shows while that campaign is ACTIVE and in its date
   * window; an item with no linked Advertisement (no schedule configured) is
   * always eligible.
   */
  listPromotions(placement: FeedPlacement, take = 3) {
    const now = new Date();
    return prisma.feedItem.findMany({
      where: {
        status: "PUBLISHED",
        placements: { has: placement },
        OR: [
          { advertisement: null },
          { advertisement: { status: "ACTIVE", startsAt: { lte: now }, endsAt: { gte: now } } },
        ],
      },
      include: { category: true, advertisement: true },
      orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
      take,
    });
  },

  async create(data: Prisma.FeedItemUncheckedCreateInput) {
    const preview = await previewFieldsForUrl(
      typeof data.externalUrl === "string" ? data.externalUrl : null,
      typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : null,
    );

    return prisma.feedItem.create({
      data: {
        ...data,
        ...preview,
      },
      include: { category: true },
    });
  },

  async refreshPreview(id: string) {
    const item = await prisma.feedItem.findUnique({ where: { id } });
    if (!item) return null;

    const preview = await previewFieldsForUrl(item.externalUrl, item.thumbnailUrl);
    return prisma.feedItem.update({
      where: { id },
      data: preview,
      include: { category: true },
    });
  },

  /** Backfill OG/oEmbed previews for items that have never been fetched. */
  async ensureMissingPreviews(limit = 25) {
    const pending = await prisma.feedItem.findMany({
      where: {
        externalUrl: { not: null },
        previewFetchedAt: null,
      },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    let refreshed = 0;
    for (const item of pending) {
      await this.refreshPreview(item.id);
      refreshed += 1;
    }
    return refreshed;
  },

  async findById(id: string) {
    return prisma.feedItem.findUnique({
      where: { id },
      include: { category: true, advertisement: true },
    });
  },

  async update(
    id: string,
    data: Prisma.FeedItemUncheckedUpdateInput & {
      externalUrl?: string | null;
      thumbnailUrl?: string | null;
    },
  ) {
    const existing = await prisma.feedItem.findUnique({ where: { id } });
    if (!existing) return null;

    const nextExternalUrl =
      data.externalUrl !== undefined ? data.externalUrl : existing.externalUrl;
    const nextThumbnail =
      data.thumbnailUrl !== undefined ? data.thumbnailUrl : existing.thumbnailUrl;
    const urlChanged =
      data.externalUrl !== undefined && data.externalUrl !== existing.externalUrl;

    const preview = urlChanged
      ? await previewFieldsForUrl(
          typeof nextExternalUrl === "string" ? nextExternalUrl : null,
          typeof nextThumbnail === "string" ? nextThumbnail : null,
        )
      : null;

    return prisma.feedItem.update({
      where: { id },
      data: {
        ...data,
        ...(preview ?? {}),
      },
      include: { category: true },
    });
  },

  async delete(id: string) {
    const existing = await prisma.feedItem.findUnique({ where: { id } });
    if (!existing) return null;

    await prisma.$transaction(async (tx) => {
      await tx.learningPath.updateMany({
        where: { requiredQuizFeedItemId: id },
        data: { requiredQuizFeedItemId: null },
      });
      await tx.userPathItemCompletion.deleteMany({ where: { feedItemId: id } });
      await tx.quizAttempt.deleteMany({ where: { feedItemId: id } });
      await tx.learningPathItem.deleteMany({ where: { feedItemId: id } });
      await tx.feedItem.delete({ where: { id } });
    });

    return { deleted: true as const };
  },

  incrementView(id: string) {
    return prisma.feedItem.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  },
};
