import type { ContentSourcePlatform, FeedType } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/encryption";
import { fetchSourceItems } from "@/lib/content-source-fetch";
import { prisma } from "@/lib/prisma";
import { feedService } from "@/services/feed.service";

export type ContentSourceForAdmin = {
  id: string;
  name: string;
  platform: ContentSourcePlatform;
  handle: string;
  isActive: boolean;
  lastFetchedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  keyPreview: string | null;
};

/** Which FeedType a fetched item becomes once imported, per source platform. */
function feedTypeForPlatform(platform: ContentSourcePlatform): FeedType {
  switch (platform) {
    case "YOUTUBE":
      return "YOUTUBE";
    case "INSTAGRAM":
      return "INSTAGRAM_REEL";
    case "RSS":
      return "ARTICLE";
  }
}

export const contentSourceService = {
  async listForAdmin(): Promise<ContentSourceForAdmin[]> {
    const rows = await prisma.contentSource.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map((row) => {
      let keyPreview: string | null = null;
      if (row.encryptedApiKey) {
        try {
          keyPreview = maskSecret(decryptSecret(row.encryptedApiKey));
        } catch {
          keyPreview = "•••• (unreadable — check SETTINGS_ENCRYPTION_KEY)";
        }
      }
      return {
        id: row.id,
        name: row.name,
        platform: row.platform,
        handle: row.handle,
        isActive: row.isActive,
        lastFetchedAt: row.lastFetchedAt,
        lastError: row.lastError,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        keyPreview,
      };
    });
  },

  async create(input: { platform: ContentSourcePlatform; name: string; handle: string; apiKey?: string; isActive: boolean }) {
    const created = await prisma.contentSource.create({
      data: {
        platform: input.platform,
        name: input.name.trim(),
        handle: input.handle.trim(),
        encryptedApiKey: input.apiKey?.trim() ? encryptSecret(input.apiKey.trim()) : null,
        isActive: input.isActive,
      },
    });
    return created.id;
  },

  async update(id: string, input: { name?: string; handle?: string; apiKey?: string; isActive?: boolean }) {
    const existing = await prisma.contentSource.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Content source not found");

    await prisma.contentSource.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.handle !== undefined ? { handle: input.handle.trim() } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.apiKey !== undefined && input.apiKey.trim()
          ? { encryptedApiKey: encryptSecret(input.apiKey.trim()), lastError: null }
          : {}),
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.contentSource.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Content source not found");
    await prisma.contentSource.delete({ where: { id } });
  },

  /**
   * Polls every active source and stages any not-yet-seen items as
   * ContentSourceItem rows (deduped by externalId). Never creates FeedItems
   * directly — that only happens when an admin explicitly imports a staged
   * item. One source erroring doesn't block the rest.
   */
  async fetchLatestForAllActive() {
    const sources = await prisma.contentSource.findMany({ where: { isActive: true } });
    const results: { sourceId: string; name: string; newCount: number; error: string | null }[] = [];

    for (const source of sources) {
      try {
        const apiKey = source.encryptedApiKey ? decryptSecret(source.encryptedApiKey) : null;
        const fetched = await fetchSourceItems(source.platform, source.handle, apiKey);

        let newCount = 0;
        for (const item of fetched) {
          const existing = await prisma.contentSourceItem.findUnique({
            where: { sourceId_externalId: { sourceId: source.id, externalId: item.externalId } },
          });
          if (existing) continue;
          await prisma.contentSourceItem.create({
            data: {
              sourceId: source.id,
              externalId: item.externalId,
              title: item.title.slice(0, 300),
              description: item.description?.slice(0, 2000) ?? null,
              thumbnailUrl: item.thumbnailUrl,
              externalUrl: item.externalUrl,
              publishedAt: item.publishedAt,
            },
          });
          newCount += 1;
        }

        await prisma.contentSource.update({
          where: { id: source.id },
          data: { lastFetchedAt: new Date(), lastError: null },
        });
        results.push({ sourceId: source.id, name: source.name, newCount, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await prisma.contentSource.update({
          where: { id: source.id },
          data: { lastFetchedAt: new Date(), lastError: message.slice(0, 500) },
        });
        results.push({ sourceId: source.id, name: source.name, newCount: 0, error: message });
      }
    }

    return results;
  },

  listNewItems() {
    return prisma.contentSourceItem.findMany({
      where: { status: "NEW" },
      include: { source: { select: { name: true, platform: true } } },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
  },

  async importToFeed(itemId: string, categoryId: string) {
    const item = await prisma.contentSourceItem.findUnique({ where: { id: itemId }, include: { source: true } });
    if (!item) throw new AppValidationError("Content source item not found");
    if (item.status !== "NEW") throw new AppValidationError("This item has already been imported or dismissed");

    const feedItem = await feedService.create({
      title: item.title,
      description: item.description || item.title,
      thumbnailUrl: item.thumbnailUrl,
      categoryId,
      type: feedTypeForPlatform(item.source.platform),
      externalUrl: item.externalUrl,
      status: "DRAFT",
      priority: 0,
      isFeatured: false,
    });

    await prisma.contentSourceItem.update({
      where: { id: itemId },
      data: { status: "IMPORTED", importedFeedItemId: feedItem.id },
    });

    return feedItem;
  },

  async importToLearningPath(itemId: string, categoryId: string, learningPathId: string) {
    const path = await prisma.learningPath.findUnique({ where: { id: learningPathId } });
    if (!path) throw new AppValidationError("Learning path not found");

    const feedItem = await this.importToFeed(itemId, categoryId);

    const lastItem = await prisma.learningPathItem.findFirst({
      where: { learningPathId },
      orderBy: { sortOrder: "desc" },
    });
    await prisma.learningPathItem.create({
      data: {
        learningPathId,
        feedItemId: feedItem.id,
        sortOrder: (lastItem?.sortOrder ?? -1) + 1,
        isRequired: true,
      },
    });

    return feedItem;
  },

  async dismiss(itemId: string) {
    const item = await prisma.contentSourceItem.findUnique({ where: { id: itemId } });
    if (!item) throw new AppValidationError("Content source item not found");
    if (item.status !== "NEW") throw new AppValidationError("This item has already been imported or dismissed");
    await prisma.contentSourceItem.update({ where: { id: itemId }, data: { status: "DISMISSED" } });
  },
};
