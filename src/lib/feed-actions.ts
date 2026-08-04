import type { FeedType } from "@prisma/client";

export type FeedActionKind =
  | "quiz"
  | "pdf"
  | "webinar"
  | "career"
  | "external"
  | "internal";

export function getFeedActionKind(type: FeedType): FeedActionKind {
  switch (type) {
    case "QUIZ":
      return "quiz";
    case "PDF":
      return "pdf";
    case "WEBINAR":
      return "webinar";
    case "CAREER_TIP":
      return "career";
    case "ADVERTISEMENT":
    case "SPONSORED":
    case "INTERNAL_PROMOTION":
    case "ARTICLE":
    case "YOUTUBE":
    case "INSTAGRAM_REEL":
    case "ANNOUNCEMENT":
      return "external";
    default:
      return "internal";
  }
}

export function getFeedActionLabel(type: FeedType): string {
  switch (type) {
    case "QUIZ":
      return "Open quiz";
    case "PDF":
      return "Open PDF";
    case "WEBINAR":
      return "Register webinar";
    case "CAREER_TIP":
      return "Book career guidance";
    case "ADVERTISEMENT":
    case "SPONSORED":
    case "INTERNAL_PROMOTION":
      return "View offer";
    default:
      return "Open";
  }
}

export function getFeedActionHref(id: string, type: FeedType): string {
  const kind = getFeedActionKind(type);
  if (kind === "quiz") return `/feed/${id}/quiz`;
  if (kind === "pdf") return `/feed/${id}/pdf`;
  if (kind === "webinar") return `/feed/${id}/webinar`;
  if (kind === "career") return `/feed/${id}/career`;
  return `/api/v1/feed/${id}/open`;
}

/** Path-aware href: keeps learners on an in-app page so they can mark items complete. */
export function getPathFeedItemHref(id: string, type: FeedType, learningPathId: string): string {
  const qs = `learningPathId=${encodeURIComponent(learningPathId)}`;
  const kind = getFeedActionKind(type);
  if (kind === "quiz") return `/feed/${id}/quiz?${qs}`;
  if (kind === "pdf") return `/feed/${id}/pdf?${qs}`;
  if (kind === "webinar") return `/feed/${id}/webinar?${qs}`;
  if (kind === "career") return `/feed/${id}/career?${qs}`;
  return `/feed/${id}/engage?${qs}`;
}

export type QuizQuestion = {
  question: string;
  options: string[];
  answer?: number;
};

export type FeedContent = {
  questions?: QuizQuestion[];
  webinarAt?: string;
  location?: string;
};

export function parseFeedContent(value: unknown): FeedContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const questions: QuizQuestion[] = [];

  if (Array.isArray(record.questions)) {
    for (const item of record.questions) {
      if (!item || typeof item !== "object") continue;
      const q = item as Record<string, unknown>;
      if (typeof q.question !== "string" || !Array.isArray(q.options)) continue;
      const options = q.options.filter((option): option is string => typeof option === "string");
      if (options.length === 0) continue;
      questions.push({
        question: q.question,
        options,
        answer: typeof q.answer === "number" ? q.answer : undefined,
      });
    }
  }

  return {
    questions: questions.length > 0 ? questions : undefined,
    webinarAt: typeof record.webinarAt === "string" ? record.webinarAt : undefined,
    location: typeof record.location === "string" ? record.location : undefined,
  };
}
