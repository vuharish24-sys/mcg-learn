import type { AiProviderType, FeedType } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { aiProviderService } from "@/services/ai-provider.service";
import { composeCoverImage } from "@/lib/image-compose";

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

export type GeneratedQuizQuestion = {
  question: string;
  options: string[];
  answer: number;
};

type GeneratedText = {
  title: string;
  description: string;
  imagePrompt: string;
  questions?: GeneratedQuizQuestion[];
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

const QUIZ_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    imagePrompt: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer" },
        },
        required: ["question", "options", "answer"],
      },
    },
  },
  required: ["title", "description", "imagePrompt", "questions"],
};

function buildPrompt(topic: string, type: FeedType, angleContext?: string) {
  const guidance = TYPE_GUIDANCE[type] ?? "Write it in a clear, engaging style suitable for a learning feed card.";
  const lines = [
    "You are writing content for MCG Learn, a medical coding education platform whose feed mixes",
    "articles, career tips, and announcements for aspiring and working medical coders.",
    "",
    `Topic: "${topic}"`,
  ];

  if (angleContext) {
    lines.push(
      `This piece is one asset in a multi-part content series on that topic. Its specific angle: "${angleContext}"`,
      "Focus narrowly on this angle only — don't try to cover the whole topic, and don't repeat ground",
      "another piece in the series would obviously already cover.",
    );
  }

  lines.push(
    `Content type: ${type}`,
    guidance,
    "",
    "Write:",
    "- title: a concise, engaging title, under 80 characters, no quotation marks",
    "- description: 2-4 plain-text sentences (no markdown, no headings) suitable for a feed card",
    "- imagePrompt: one sentence describing a professional, brand-appropriate cover image for this",
    "  (teal and white color scheme, no embedded text or words in the image, no logos).",
    "  Describe an object, document, workspace, or abstract/flat-design scene related to the topic —",
    "  NOT a photorealistic human face or figure. The free image model used renders objects and scenes",
    "  sharply but renders people poorly (soft, uncanny features), so people-free prompts look far better.",
  );

  if (type === "QUIZ") {
    lines.push(
      "- questions: an array of exactly 5 multiple-choice quiz questions that test understanding of the topic.",
      "  Each question has: question (string), options (array of exactly 4 short strings),",
      "  answer (integer 0-3, the index into options of the single correct choice)",
    );
  }

  lines.push(
    "",
    type === "QUIZ"
      ? 'Return only JSON: {"title": string, "description": string, "imagePrompt": string, "questions": [{"question": string, "options": string[], "answer": number}]}'
      : 'Return only JSON: {"title": string, "description": string, "imagePrompt": string}',
  );

  return lines.join("\n");
}

function parseGeneratedText(rawText: string, providerName: string, requireQuestions: boolean): GeneratedText {
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

  const base = {
    title: result.title.trim().slice(0, 180),
    description: result.description.trim().slice(0, 3000),
    imagePrompt: result.imagePrompt.trim(),
  };

  if (!requireQuestions) return base;

  const rawQuestions = Array.isArray(result.questions) ? result.questions : [];
  const questions: GeneratedQuizQuestion[] = [];
  for (const entry of rawQuestions) {
    if (!entry || typeof entry !== "object") continue;
    const q = entry as Record<string, unknown>;
    if (typeof q.question !== "string" || !Array.isArray(q.options)) continue;
    const options = q.options.filter((option): option is string => typeof option === "string");
    if (options.length < 2 || typeof q.answer !== "number") continue;
    if (q.answer < 0 || q.answer >= options.length) continue;
    questions.push({ question: q.question.trim(), options: options.map((o) => o.trim()), answer: q.answer });
  }

  if (questions.length < 2) {
    throw new Error(`${providerName} did not return usable quiz questions`);
  }

  return { ...base, questions };
}

// ---- Content map: breaks one master topic into a multi-asset series plan ----

export type ContentMapAngle = {
  day: number;
  angle: string;
  format: FeedType;
  rationale: string;
};

/** Formats AI can complete end-to-end — kept in sync with aiGeneratableFeedTypes in feed-form.ts. */
const CONTENT_MAP_FORMATS: FeedType[] = ["ARTICLE", "CAREER_TIP", "QUIZ", "ANNOUNCEMENT", "INTERNAL_PROMOTION"];

const CONTENT_MAP_SCHEMA = {
  type: "object",
  properties: {
    angles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day: { type: "integer" },
          angle: { type: "string" },
          format: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["day", "angle", "format", "rationale"],
      },
    },
  },
  required: ["angles"],
};

function buildContentMapPrompt(topic: string, count: number) {
  return [
    "You are a content strategist for MCG Learn, a medical coding education platform.",
    `Break this master topic into ${count} distinct, non-repetitive content assets for a multi-day`,
    "social media and learning feed series. Each asset must cover a genuinely different angle —",
    "don't just rewrite the same explanation multiple times.",
    "",
    `Master topic: "${topic}"`,
    "",
    "Vary the angle across things like: a plain-language introduction, a definition, a comparison",
    "against a related concept, a real-world example, a common mistake or misconception, career",
    "relevance, and a knowledge-check quiz. Not all of these fit every topic — use judgment.",
    "",
    `Allowed formats (use the field name exactly): ${CONTENT_MAP_FORMATS.join(", ")}.`,
    "- Include at least one QUIZ.",
    `- At most 1 of the ${count} assets may be ANNOUNCEMENT or INTERNAL_PROMOTION — this is an`,
    "  educational series, not a promotional campaign.",
    "- Assign day as a suggested posting order, starting at 1.",
    "",
    'Return only JSON: {"angles": [{"day": number, "angle": string, "format": string, "rationale": string}]}',
    '- angle: a short label like "Day 3 - ICD-10-CM vs CPT", specific enough that it won\'t overlap',
    "  with the other assets in the series",
    "- rationale: one sentence on why this angle earns its place in the series",
  ].join("\n");
}

function parseContentMap(rawText: string, providerName: string): ContentMapAngle[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`${providerName} returned invalid JSON`);
  }

  const result = parsed as Record<string, unknown>;
  if (!Array.isArray(result.angles)) {
    throw new Error(`${providerName} returned an unexpected response shape`);
  }

  const angles: ContentMapAngle[] = [];
  for (const entry of result.angles) {
    if (!entry || typeof entry !== "object") continue;
    const a = entry as Record<string, unknown>;
    if (typeof a.angle !== "string" || typeof a.format !== "string" || typeof a.rationale !== "string") continue;
    if (!CONTENT_MAP_FORMATS.includes(a.format as FeedType)) continue;
    angles.push({
      day: typeof a.day === "number" ? a.day : angles.length + 1,
      angle: a.angle.trim(),
      format: a.format as FeedType,
      rationale: a.rationale.trim(),
    });
  }

  if (angles.length < 2) {
    throw new Error(`${providerName} did not return a usable content map`);
  }

  return angles.sort((a, b) => a.day - b.day);
}

// ---- Provider calling (generic over the parsed response shape) ----

async function callGemini<T>(
  apiKey: string,
  prompt: string,
  schema: object,
  parse: (text: string, providerName: string) => T,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
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

  return parse(text, "Gemini");
}

async function callGroq<T>(
  apiKey: string,
  prompt: string,
  parse: (text: string, providerName: string) => T,
): Promise<T> {
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

  return parse(text, "Groq");
}

async function callProvider<T>(
  providerType: AiProviderType,
  apiKey: string,
  prompt: string,
  schema: object,
  parse: (text: string, providerName: string) => T,
): Promise<T> {
  if (providerType === "GEMINI") return callGemini(apiKey, prompt, schema, parse);
  return callGroq(apiKey, prompt, parse);
}

/**
 * Runs one AI call against admin-configured providers in priority order, falling
 * back to GEMINI_API_KEY/GROQ_API_KEY env vars only when the AiProviderConfig
 * table has zero rows (i.e. in-app configuration has never been set up). If the
 * table has any rows at all it's authoritative, even if every row is disabled —
 * that's a deliberate admin choice, not a signal to fall back. Shared by every
 * AI call in this module so fallback/error-reporting stays consistent.
 */
async function withProviderFallback<T>(
  attempt: (providerType: AiProviderType, apiKey: string) => Promise<T>,
  envProviders: [string, string | undefined, (apiKey: string) => Promise<T>][],
): Promise<T> {
  const failures: string[] = [];

  const dbConfigured = await aiProviderService.hasAnyConfigured();
  if (dbConfigured) {
    const configs = await aiProviderService.listEnabledWithKeys();
    for (const config of configs) {
      try {
        const result = await attempt(config.providerType, config.apiKey);
        await aiProviderService.recordSuccess(config.id);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${config.label}: ${message}`);
        console.error(`AI generation via ${config.label} failed, trying next provider`, error);
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
  let anyConfigured = false;
  for (const [name, apiKey, call] of envProviders) {
    if (!apiKey) continue;
    anyConfigured = true;
    try {
      return await call(apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${name}: ${message}`);
      console.error(`AI generation via ${name} failed, trying next provider`, error);
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
 * Generates a title, description, and a follow-up image prompt for a feed item
 * from an admin-given topic (optionally narrowed to one angle within a
 * multi-asset content series — see generateContentMap).
 */
export async function generateFeedContent(
  topic: string,
  type: FeedType,
  angleContext?: string,
): Promise<GeneratedText> {
  const requireQuestions = type === "QUIZ";
  const prompt = buildPrompt(topic, type, angleContext);
  const schema = requireQuestions ? QUIZ_RESPONSE_SCHEMA : RESPONSE_SCHEMA;
  const parse = (text: string, providerName: string) => parseGeneratedText(text, providerName, requireQuestions);

  return withProviderFallback(
    (providerType, apiKey) => callProvider(providerType, apiKey, prompt, schema, parse),
    [
      ["Gemini", process.env.GEMINI_API_KEY, (apiKey) => callGemini(apiKey, prompt, schema, parse)],
      ["Groq", process.env.GROQ_API_KEY, (apiKey) => callGroq(apiKey, prompt, parse)],
    ],
  );
}

/**
 * Breaks one master topic into a plan of distinct, non-repetitive content
 * assets (a "content map") — each with its own angle, target format, and
 * suggested posting order. Doesn't generate the assets themselves; pair with
 * generateFeedContent(topic, angle.format, angle.angle) per angle to do that.
 */
export async function generateContentMap(topic: string, count: number): Promise<ContentMapAngle[]> {
  const prompt = buildContentMapPrompt(topic, count);
  const parse = (text: string, providerName: string) => parseContentMap(text, providerName);

  return withProviderFallback(
    (providerType, apiKey) => callProvider(providerType, apiKey, prompt, CONTENT_MAP_SCHEMA, parse),
    [
      ["Gemini", process.env.GEMINI_API_KEY, (apiKey) => callGemini(apiKey, prompt, CONTENT_MAP_SCHEMA, parse)],
      ["Groq", process.env.GROQ_API_KEY, (apiKey) => callGroq(apiKey, prompt, parse)],
    ],
  );
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

/**
 * Generates a cover image from Pollinations.ai and overlays the asset's title
 * as legible text (see composeCoverImage) — turns a generic AI photo into a
 * proper title card. Falls back to the plain background image if compositing
 * fails for any reason (e.g. an unusual image format), since a cover image
 * without a title overlay is still better than none at all.
 */
export async function generateComposedCoverImage(prompt: string, title: string): Promise<File> {
  const background = await generateCoverImage(prompt);
  const backgroundBuffer = Buffer.from(await background.arrayBuffer());

  try {
    const composed = await composeCoverImage(backgroundBuffer, title);
    return new File([new Uint8Array(composed)], `ai-generated-${Date.now()}.jpg`, { type: "image/jpeg" });
  } catch (error) {
    console.error("Cover image text overlay failed, using plain background image", error);
    return background;
  }
}
