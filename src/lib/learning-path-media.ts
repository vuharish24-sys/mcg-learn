import type { FeedType } from "@prisma/client";

export type PathFeedMedia = {
  title: string;
  type: FeedType;
  thumbnailUrl?: string | null;
  previewImageUrl?: string | null;
  previewTitle?: string | null;
  previewSiteName?: string | null;
  externalUrl?: string | null;
};

export function feedItemImageUrl(item: PathFeedMedia | null | undefined) {
  if (!item) return null;
  return item.previewImageUrl || item.thumbnailUrl || null;
}

export function pathCoverImageUrl(
  path: { thumbnailUrl?: string | null },
  items: { feedItem: PathFeedMedia }[] = [],
) {
  if (path.thumbnailUrl) return path.thumbnailUrl;
  for (const item of items) {
    const url = feedItemImageUrl(item.feedItem);
    if (url) return url;
  }
  return null;
}

export function pathPreviewImages(
  items: { feedItem: PathFeedMedia }[],
  limit = 4,
) {
  const urls: string[] = [];
  for (const item of items) {
    const url = feedItemImageUrl(item.feedItem);
    if (url && !urls.includes(url)) urls.push(url);
    if (urls.length >= limit) break;
  }
  return urls;
}

export function safeBgImage(url: string) {
  return `url("${url.replaceAll('"', "%22")}")`;
}
