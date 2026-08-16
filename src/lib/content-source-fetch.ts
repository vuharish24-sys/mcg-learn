import type { ContentSourcePlatform } from "@prisma/client";

export type FetchedSourceItem = {
  externalId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  externalUrl: string;
  publishedAt: Date | null;
};

const FETCH_TIMEOUT_MS = 8000;
const MAX_ITEMS = 15;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Request failed (${response.status}): ${body.slice(0, 300)}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves a YouTube channel's "uploads" playlist ID, accepting either a raw channel ID (UC...) or an @handle. */
async function resolveYouTubeUploadsPlaylistId(handle: string, apiKey: string): Promise<string> {
  const idParam = handle.startsWith("UC") ? `id=${encodeURIComponent(handle)}` : `forHandle=${encodeURIComponent(handle.replace(/^@/, "@"))}`;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&${idParam}&key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson<{ items?: { contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] }>(url);
  const uploads = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error(`No YouTube channel found for "${handle}"`);
  return uploads;
}

export async function fetchYouTubeUploads(handle: string, apiKey: string): Promise<FetchedSourceItem[]> {
  const playlistId = await resolveYouTubeUploadsPlaylistId(handle, apiKey);
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=${MAX_ITEMS}&key=${encodeURIComponent(apiKey)}`;
  const data = await fetchJson<{
    items?: {
      contentDetails?: { videoId?: string; videoPublishedAt?: string };
      snippet?: { title?: string; description?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> };
    }[];
  }>(url);

  const items: FetchedSourceItem[] = [];
  for (const entry of data.items ?? []) {
    const videoId = entry.contentDetails?.videoId;
    if (!videoId) continue;
    const snippet = entry.snippet;
    const thumbnail =
      snippet?.thumbnails?.medium?.url ?? snippet?.thumbnails?.high?.url ?? snippet?.thumbnails?.default?.url ?? null;
    const published = entry.contentDetails?.videoPublishedAt ?? snippet?.publishedAt;
    items.push({
      externalId: videoId,
      title: snippet?.title ?? "Untitled video",
      description: snippet?.description ?? null,
      thumbnailUrl: thumbnail,
      externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: published ? new Date(published) : null,
    });
  }
  return items;
}

export async function fetchInstagramMedia(igUserId: string, accessToken: string): Promise<FetchedSourceItem[]> {
  const fields = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  const url = `https://graph.instagram.com/${encodeURIComponent(igUserId)}/media?fields=${fields}&limit=${MAX_ITEMS}&access_token=${encodeURIComponent(accessToken)}`;
  const data = await fetchJson<{
    data?: {
      id: string;
      caption?: string;
      media_type?: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
    }[];
  }>(url);

  return (data.data ?? [])
    .filter((entry) => entry.permalink)
    .map((entry) => {
      const caption = entry.caption?.trim() ?? "";
      const title = caption ? (caption.length > 80 ? `${caption.slice(0, 77)}…` : caption) : "Instagram post";
      return {
        externalId: entry.id,
        title,
        description: caption || null,
        thumbnailUrl: entry.thumbnail_url ?? (entry.media_type === "VIDEO" ? null : entry.media_url ?? null),
        externalUrl: entry.permalink as string,
        publishedAt: entry.timestamp ? new Date(entry.timestamp) : null,
      };
    });
}

function stripCdata(value: string): string {
  const match = value.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return match ? match[1] : value;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num: string) => String.fromCodePoint(Number.parseInt(num, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  if (!match) return null;
  return decodeXmlEntities(stripCdata(match[1].trim()));
}

function xmlAttr(block: string, tag: string, attr: string): string | null {
  const match = block.match(new RegExp(`<${tag}\\s+[^>]*${attr}=["']([^"']+)["']`, "i"));
  return match ? decodeXmlEntities(match[1]) : null;
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Minimal, dependency-free RSS 2.0 / Atom parser — just enough to surface a blog's recent posts. */
export async function fetchRssItems(feedUrl: string): Promise<FetchedSourceItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let xml: string;
  try {
    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "MCGLearnBot/1.0 (+https://medicalcodingglobal.com)", Accept: "application/rss+xml,application/atom+xml,application/xml,text/xml" },
    });
    if (!response.ok) throw new Error(`Feed request failed (${response.status})`);
    xml = await response.text();
  } finally {
    clearTimeout(timer);
  }

  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const entryTag = isAtom ? "entry" : "item";
  const blocks = xml.match(new RegExp(`<${entryTag}(?:\\s[^>]*)?>[\\s\\S]*?</${entryTag}>`, "gi")) ?? [];

  const items: FetchedSourceItem[] = [];
  for (const block of blocks.slice(0, MAX_ITEMS)) {
    const title = xmlTag(block, "title");
    const link = isAtom
      ? xmlAttr(block, "link", "href") ?? xmlTag(block, "link")
      : xmlTag(block, "link");
    if (!title || !link) continue;

    const guid = xmlTag(block, "guid") ?? xmlTag(block, "id") ?? link;
    const rawDescription = xmlTag(block, "description") ?? xmlTag(block, "summary") ?? xmlTag(block, "content");
    const description = rawDescription ? stripHtmlTags(rawDescription).slice(0, 500) : null;
    const dateRaw = xmlTag(block, "pubDate") ?? xmlTag(block, "updated") ?? xmlTag(block, "published");
    const publishedAt = dateRaw ? new Date(dateRaw) : null;
    const thumbnail =
      xmlAttr(block, "media:thumbnail", "url") ??
      xmlAttr(block, "media:content", "url") ??
      xmlAttr(block, "enclosure", "url") ??
      (rawDescription ? rawDescription.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null : null);

    items.push({
      externalId: guid,
      title,
      description,
      thumbnailUrl: thumbnail,
      externalUrl: link,
      publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
    });
  }
  return items;
}

export function fetchSourceItems(
  platform: ContentSourcePlatform,
  handle: string,
  apiKey: string | null,
): Promise<FetchedSourceItem[]> {
  switch (platform) {
    case "YOUTUBE":
      if (!apiKey) throw new Error("YouTube source is missing its API key");
      return fetchYouTubeUploads(handle, apiKey);
    case "INSTAGRAM":
      if (!apiKey) throw new Error("Instagram source is missing its access token");
      return fetchInstagramMedia(handle, apiKey);
    case "RSS":
      return fetchRssItems(handle);
  }
}
