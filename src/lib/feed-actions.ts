import type { FeedType } from "@prisma/client";

export type FeedActionKind =
  | "quiz"
  | "pdf"
  | "webinar"
  | "career"
  | "watch"
  | "job"
  | "course"
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
    case "YOUTUBE":
    case "INSTAGRAM_REEL":
      return "watch";
    case "JOB_POSTING":
      return "job";
    case "COURSE":
      return "course";
    case "ADVERTISEMENT":
    case "SPONSORED":
    case "INTERNAL_PROMOTION":
    case "ARTICLE":
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
    case "YOUTUBE":
    case "INSTAGRAM_REEL":
      return "Watch";
    case "JOB_POSTING":
      return "View job";
    case "COURSE":
      return "View course";
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
  if (kind === "watch") return `/feed/${id}/watch`;
  // Deliberately NOT under /feed — job postings must stay reachable without an
  // MCG account (partner-institute visitors have none), and /feed is gated by
  // middleware. This is the one content type with its own public route.
  if (kind === "job") return `/jobs/${id}`;
  if (kind === "course") return `/feed/${id}/course`;
  return `/api/v1/feed/${id}/open`;
}

/** Path-aware href: keeps learners on an in-app page so they can mark completion. */
export function getPathFeedItemHref(id: string, type: FeedType, learningPathId: string): string {
  const qs = `learningPathId=${encodeURIComponent(learningPathId)}`;
  const kind = getFeedActionKind(type);
  if (kind === "quiz") return `/feed/${id}/quiz?${qs}`;
  if (kind === "pdf") return `/feed/${id}/pdf?${qs}`;
  if (kind === "webinar") return `/feed/${id}/webinar?${qs}`;
  if (kind === "career") return `/feed/${id}/career?${qs}`;
  if (kind === "watch") return `/feed/${id}/watch?${qs}`;
  if (kind === "job") return `/jobs/${id}`;
  if (kind === "course") return `/feed/${id}/course?${qs}`;
  return `/feed/${id}/engage?${qs}`;
}

/** Extracts an embeddable YouTube video ID from watch/shorts/youtu.be/embed URL formats. */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\.|^m\.|^music\./, "");
    if (host === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
    if (host === "youtube.com") {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (shortsMatch) return shortsMatch[1];
      const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)/);
      if (embedMatch) return embedMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

export type QuizQuestion = {
  question: string;
  options: string[];
  answer?: number;
};

export type JobCtaType = "LINK" | "FORM" | "NONE";

export type JobPostingContent = {
  company?: string;
  location?: string;
  employmentType?: string;
  eligibility?: string;
  closesAt?: string;
  ctaType: JobCtaType;
  ctaLabel?: string;
  ctaUrl?: string;
};

export type CourseCtaType = "LINK" | "FORM" | "NONE";

/**
 * One priced option of a course — e.g. "Batch Classes, Online" vs.
 * "One-to-One, Offline". tier + mode are independent dimensions (a course
 * can offer several tiers, each in several modes). id is a stable
 * client-generated identifier (not a DB primary key — variants live in this
 * JSON array) used to map Benefit rows (coupons/scholarships/perks) onto a
 * specific variant via CourseVariantBenefit.
 */
export type CourseVariant = {
  id: string;
  mode: string;
  tier?: string;
  fee?: string;
  duration?: string;
  startDate?: string;
  ctaType: CourseCtaType;
  ctaLabel?: string;
  ctaUrl?: string;
};

export type CourseContent = {
  instructor?: string;
  variants: CourseVariant[];
};

export type FeedContent = {
  questions?: QuizQuestion[];
  webinarAt?: string;
  location?: string;
  job?: JobPostingContent;
  course?: CourseContent;
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
    job: parseJobPostingContent(record),
    course: parseCourseContent(record),
  };
}

function parseJobPostingContent(record: Record<string, unknown>): JobPostingContent | undefined {
  const raw = record.job;
  if (!raw || typeof raw !== "object") return undefined;
  const job = raw as Record<string, unknown>;

  const ctaType: JobCtaType = job.ctaType === "LINK" || job.ctaType === "FORM" ? job.ctaType : "NONE";

  return {
    company: typeof job.company === "string" ? job.company : undefined,
    location: typeof job.location === "string" ? job.location : undefined,
    employmentType: typeof job.employmentType === "string" ? job.employmentType : undefined,
    eligibility: typeof job.eligibility === "string" ? job.eligibility : undefined,
    closesAt: typeof job.closesAt === "string" ? job.closesAt : undefined,
    ctaType,
    ctaLabel: typeof job.ctaLabel === "string" ? job.ctaLabel : undefined,
    ctaUrl: ctaType === "LINK" && typeof job.ctaUrl === "string" ? job.ctaUrl : undefined,
  };
}

function parseCourseVariant(raw: unknown, fallbackId: string): CourseVariant | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const variant = raw as Record<string, unknown>;
  if (typeof variant.mode !== "string" || !variant.mode.trim()) return undefined;

  const ctaType: CourseCtaType =
    variant.ctaType === "LINK" || variant.ctaType === "FORM" ? variant.ctaType : "NONE";

  return {
    id: typeof variant.id === "string" && variant.id ? variant.id : fallbackId,
    mode: variant.mode,
    tier: typeof variant.tier === "string" ? variant.tier : undefined,
    fee: typeof variant.fee === "string" ? variant.fee : undefined,
    duration: typeof variant.duration === "string" ? variant.duration : undefined,
    startDate: typeof variant.startDate === "string" ? variant.startDate : undefined,
    ctaType,
    ctaLabel: typeof variant.ctaLabel === "string" ? variant.ctaLabel : undefined,
    ctaUrl: ctaType === "LINK" && typeof variant.ctaUrl === "string" ? variant.ctaUrl : undefined,
  };
}

function parseCourseContent(record: Record<string, unknown>): CourseContent | undefined {
  const raw = record.course;
  if (!raw || typeof raw !== "object") return undefined;
  const course = raw as Record<string, unknown>;

  const variants = Array.isArray(course.variants)
    ? course.variants
        .map((v, i) => parseCourseVariant(v, `legacy-${i}`))
        .filter((v): v is CourseVariant => v !== undefined)
    : [];
  if (variants.length === 0) return undefined;

  return {
    instructor: typeof course.instructor === "string" ? course.instructor : undefined,
    variants,
  };
}

export type VariantBenefitMapping = { variantId: string; benefitIds: string[] };

/**
 * The course admin form submits `variantBenefits` as a sibling of `course`
 * inside the same content JSON (so a single Save button can carry both the
 * content update and the relational benefit-mapping sync). This pulls that
 * mapping out and returns the content with it stripped, since the mapping
 * itself lives in CourseVariantBenefit, not in the stored content JSON.
 */
export function extractVariantBenefits(content: unknown): {
  content: unknown;
  variantBenefits: VariantBenefitMapping[];
} {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return { content, variantBenefits: [] };
  }
  const record = content as Record<string, unknown>;
  if (!("variantBenefits" in record)) return { content, variantBenefits: [] };

  const { variantBenefits: raw, ...rest } = record;
  const variantBenefits: VariantBenefitMapping[] = Array.isArray(raw)
    ? raw
        .filter(
          (row): row is { variantId: string; benefitIds: unknown[] } =>
            !!row && typeof row === "object" && typeof (row as Record<string, unknown>).variantId === "string",
        )
        .map((row) => ({
          variantId: row.variantId,
          benefitIds: Array.isArray(row.benefitIds)
            ? row.benefitIds.filter((id): id is string => typeof id === "string")
            : [],
        }))
    : [];

  return { content: rest, variantBenefits };
}
