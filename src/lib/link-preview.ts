export type LinkPreview = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 512_000;

function isYouTubeUrl(url: URL) {
  return (
    url.hostname === "youtu.be" ||
    url.hostname === "youtube.com" ||
    url.hostname === "www.youtube.com" ||
    url.hostname === "m.youtube.com"
  );
}

function isInstagramUrl(url: URL) {
  return (
    url.hostname === "instagram.com" ||
    url.hostname === "www.instagram.com" ||
    url.hostname === "instagr.am" ||
    url.hostname === "www.instagr.am"
  );
}

function metaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim());
  }
  return null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(hex, 16));
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);/g, (_, num: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(num, 10));
      } catch {
        return "";
      }
    })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function absoluteUrl(base: URL, maybeRelative: string | null) {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "MCGLearnBot/1.0 (+https://medicalcodingglobal.com)",
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchYouTubePreview(url: URL): Promise<LinkPreview | null> {
  const oembed = new URL("https://www.youtube.com/oembed");
  oembed.searchParams.set("url", url.toString());
  oembed.searchParams.set("format", "json");
  const response = await fetchWithTimeout(oembed.toString());
  if (!response.ok) return null;
  const data = (await response.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
    provider_name?: string;
  };
  return {
    title: data.title ?? null,
    description: data.author_name ? `Video by ${data.author_name}` : null,
    imageUrl: data.thumbnail_url ?? null,
    siteName: data.provider_name ?? "YouTube",
  };
}

async function fetchInstagramPreview(url: URL): Promise<LinkPreview | null> {
  // Prefer HTML OG scrape first (works for many public posts); fall back to oEmbed.
  const fromHtml = await fetchOpenGraphPreview(url);
  if (fromHtml?.imageUrl || fromHtml?.title) {
    return {
      ...fromHtml,
      title: fromHtml.title ? decodeHtmlEntities(fromHtml.title) : null,
      description: fromHtml.description ? decodeHtmlEntities(fromHtml.description) : null,
      siteName: fromHtml.siteName ?? "Instagram",
    };
  }

  try {
    const oembed = new URL("https://www.instagram.com/api/v1/oembed");
    oembed.searchParams.set("url", url.toString());
    const response = await fetchWithTimeout(oembed.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return fromHtml;
    const data = (await response.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
      provider_name?: string;
    };
    return {
      title: data.title ? decodeHtmlEntities(data.title) : null,
      description: data.author_name ? `Post by ${data.author_name}` : null,
      imageUrl: data.thumbnail_url ?? null,
      siteName: data.provider_name ?? "Instagram",
    };
  } catch {
    return fromHtml;
  }
}

async function fetchOpenGraphPreview(url: URL): Promise<LinkPreview | null> {
  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    return {
      title: null,
      description: null,
      imageUrl: null,
      siteName: url.hostname.replace(/^www\./, ""),
    };
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const text = (await response.text()).slice(0, MAX_HTML_BYTES);
    return parseOgHtml(url, text);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_HTML_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    total += value.byteLength;
  }
  reader.cancel().catch(() => undefined);

  const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
  return parseOgHtml(url, html);
}

function parseOgHtml(url: URL, html: string): LinkPreview {
  const title =
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
    null;

  const description =
    metaContent(html, "og:description") ||
    metaContent(html, "twitter:description") ||
    metaContent(html, "description");

  const imageRaw =
    metaContent(html, "og:image") ||
    metaContent(html, "twitter:image") ||
    metaContent(html, "twitter:image:src");

  const siteName =
    metaContent(html, "og:site_name") || url.hostname.replace(/^www\./, "");

  return {
    title: title ? decodeHtmlEntities(title) : null,
    description,
    imageUrl: absoluteUrl(url, imageRaw),
    siteName,
  };
}

/** Fetch link preview metadata. Returns null on hard failure. */
export async function fetchLinkPreview(rawUrl: string): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol)) return null;

  try {
    if (isYouTubeUrl(url)) {
      return await fetchYouTubePreview(url);
    }
    if (isInstagramUrl(url)) {
      return await fetchInstagramPreview(url);
    }
    return await fetchOpenGraphPreview(url);
  } catch {
    return null;
  }
}
