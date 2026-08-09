import type { FeedType } from "@prisma/client";
import { AppValidationError } from "@/lib/api";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    imagePrompt: { type: "string" },
  },
  required: ["title", "description", "imagePrompt"],
};

function buildPrompt(topic: string, type: FeedType) {
  const guidance = TYPE_GUIDANCE[type] ?? "Write it in a clear, engaging style suitable for a learning feed card.";
  return [
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
    'Return only JSON: {"title": string, "description": string, "imagePrompt": string}',
  ].join("\n");
}

function parseGeneratedText(rawText: string, providerName: string): GeneratedText {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`${providerName} returned invalid JSON`);
  }

  const result = parsed as Record<string, unknown>;
  if (
    typeof result.title !== "string" ||
    typeof result.description !== "string" ||
    typeof result.imagePrompt !== "string"
  ) {
    throw new Error(`${providerName} returned an unexpected response shape`);
  }

  return {
    title: result.title.trim().slice(0, 180),
    description: result.description.trim().slice(0, 3000),
    imagePrompt: result.imagePrompt.trim(),
  };
}

/** Returns null if not configured (skip to next provider); throws if configured but the call failed. */
async function tryGemini(prompt: string): Promise<GeneratedText | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error("could not reach Gemini");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini returned ${response.status}: ${errorText.slice(0, 150) || "unknown error"}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response");

  return parseGeneratedText(text, "Gemini");
}

/** Returns null if not configured (skip to next provider); throws if configured but the call failed. */
async function tryGroq(prompt: string): Promise<GeneratedText | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error("could not reach Groq");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Groq returned ${response.status}: ${errorText.slice(0, 150) || "unknown error"}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq returned an empty response");

  return parseGeneratedText(text, "Groq");
}

/**
 * Generates a title, description, and a follow-up image prompt for a feed item
 * from an admin-given topic. Tries Gemini first, falls back to Groq if Gemini
 * isn't configured or its call fails - two independent free-tier providers so
 * one outage or missing key doesn't block content generation entirely.
 */
export async function generateFeedContent(topic: string, type: FeedType): Promise<GeneratedText> {
  const prompt = buildPrompt(topic, type);
  const providers: [string, (p: string) => Promise<GeneratedText | null>][] = [
    ["Gemini", tryGemini],
    ["Groq", tryGroq],
  ];

  let anyConfigured = false;
  const failures: string[] = [];

  for (const [name, run] of providers) {
    try {
      const result = await run(prompt);
      if (result === null) continue; // not configured, try the next one
      return result;
    } catch (error) {
      anyConfigured = true;
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
      console.error(`AI text generation via ${name} failed, trying next provider`, error);
    }
  }

  if (!anyConfigured) {
    throw new AppValidationError(
      "AI content generation is not configured. Set GEMINI_API_KEY or GROQ_API_KEY.",
    );
  }
  throw new AppValidationError(`All configured AI providers failed. ${failures.join(" ")}`);
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
