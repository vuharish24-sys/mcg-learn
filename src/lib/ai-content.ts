import type { AiProviderType, FeedType } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { aiProviderService } from "@/services/ai-provider.service";

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

async function callGemini(apiKey: string, prompt: string): Promise<GeneratedText> {
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

async function callGroq(apiKey: string, prompt: string): Promise<GeneratedText> {
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

async function callProvider(providerType: AiProviderType, apiKey: string, prompt: string): Promise<GeneratedText> {
  if (providerType === "GEMINI") return callGemini(apiKey, prompt);
  return callGroq(apiKey, prompt);
}

/**
 * Generates a title, description, and a follow-up image prompt for a feed item
 * from an admin-given topic.
 *
 * Provider source, in order of precedence:
 * 1. Admin-configured providers (Admin > AI Providers), tried in priority order.
 *    If that table has any rows at all, it's authoritative — even if every row
 *    is currently disabled, that's a deliberate admin choice, not a signal to
 *    fall back.
 * 2. GEMINI_API_KEY / GROQ_API_KEY env vars, only when the table has zero rows
 *    (i.e. the in-app configuration has never been set up) — keeps the
 *    env-var setup from before this feature existed working without changes.
 */
export async function generateFeedContent(topic: string, type: FeedType): Promise<GeneratedText> {
  const prompt = buildPrompt(topic, type);
  const failures: string[] = [];

  const dbConfigured = await aiProviderService.hasAnyConfigured();
  if (dbConfigured) {
    const configs = await aiProviderService.listEnabledWithKeys();
    for (const config of configs) {
      try {
        const result = await callProvider(config.providerType, config.apiKey, prompt);
        await aiProviderService.recordSuccess(config.id);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${config.label}: ${message}`);
        console.error(`AI text generation via ${config.label} failed, trying next provider`, error);
        await aiProviderService.recordFailure(config.id, message);
      }
    }
    if (configs.length === 0) {
      throw new AppValidationError(
        "No AI providers are enabled. Enable one in Admin > AI Providers, or add a new one.",
      );
    }
    throw new AppValidationError(`All enabled AI providers failed. ${failures.join(" ")}`);
  }

  // No in-app config exists yet — fall back to env vars.
  const envProviders: [string, string | undefined, (key: string, p: string) => Promise<GeneratedText>][] = [
    ["Gemini", process.env.GEMINI_API_KEY, callGemini],
    ["Groq", process.env.GROQ_API_KEY, callGroq],
  ];

  let anyConfigured = false;
  for (const [name, apiKey, call] of envProviders) {
    if (!apiKey) continue;
    anyConfigured = true;
    try {
      return await call(apiKey, prompt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
      console.error(`AI text generation via ${name} failed, trying next provider`, error);
    }
  }

  if (!anyConfigured) {
    throw new AppValidationError(
      "AI content generation is not configured. Add a provider in Admin > AI Providers, or set GEMINI_API_KEY / GROQ_API_KEY.",
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
