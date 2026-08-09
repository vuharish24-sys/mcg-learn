import type { FeedType } from "@prisma/client";
import { AppValidationError } from "@/lib/api";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const TYPE_GUIDANCE: Partial<Record<FeedType, string>> = {
  ARTICLE: "Write it like an informative blog post excerpt.",
  CAREER_TIP: "Write practical, encouraging career advice a medical coding student could act on today.",
  ANNOUNCEMENT: "Write it like a brief, upbeat platform announcement.",
  INTERNAL_PROMOTION: "Write it like a short promotional blurb encouraging learners to take an action.",
};

type GeneratedText = {
  title: string;
  description: string;
  imagePrompt: string;
};

/** Generates a title, description, and a follow-up image prompt for a feed item from an admin-given topic. */
export async function generateFeedContent(topic: string, type: FeedType): Promise<GeneratedText> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AppValidationError("AI content generation is not configured (missing GEMINI_API_KEY).");
  }

  const guidance = TYPE_GUIDANCE[type] ?? "Write it in a clear, engaging style suitable for a learning feed card.";
  const prompt = [
    "You are writing content for MCG Learn, a medical coding education platform whose feed mixes",
    "articles, career tips, and announcements for aspiring and working medical coders.",
    "",
    `Topic: "${topic}"`,
    `Content type: ${type}`,
    guidance,
    "",
    "Write:",
    "- title: a concise, engaging title, under 80 characters, no quotation marks",
    "- description: 2-4 plain-text sentences (no markdown, no headings) suitable for a feed card",
    "- imagePrompt: one sentence describing a professional, brand-appropriate cover image for this",
    "  (teal and white color scheme, no embedded text or words in the image, no logos)",
    "",
    "Return only JSON matching the schema.",
  ].join("\n");

  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              imagePrompt: { type: "string" },
            },
            required: ["title", "description", "imagePrompt"],
          },
        },
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new AppValidationError("Could not reach the AI text generation service. Try again in a moment.");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new AppValidationError(
      `AI text generation failed (${response.status}): ${errorText.slice(0, 200) || "unknown error"}`,
    );
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new AppValidationError("AI text generation returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppValidationError("AI text generation returned invalid JSON.");
  }

  const result = parsed as Record<string, unknown>;
  if (
    typeof result.title !== "string" ||
    typeof result.description !== "string" ||
    typeof result.imagePrompt !== "string"
  ) {
    throw new AppValidationError("AI text generation returned an unexpected response shape.");
  }

  return {
    title: result.title.trim().slice(0, 180),
    description: result.description.trim().slice(0, 3000),
    imagePrompt: result.imagePrompt.trim(),
  };
}

/**
 * Fetches a generated cover image from Pollinations.ai (free, keyless) as a File
 * ready for upload to our own storage. This is a free public service with no
 * uptime guarantee — callers should treat failures as non-fatal.
 */
export async function generateCoverImage(prompt: string): Promise<File> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true`;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  } catch {
    throw new AppValidationError("Could not reach the AI image generation service.");
  }

  if (!response.ok) {
    throw new AppValidationError(`AI image generation failed (${response.status}).`);
  }
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new AppValidationError("AI image generation did not return an image.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return new File([buffer], `ai-generated-${Date.now()}.jpg`, { type: contentType });
}
