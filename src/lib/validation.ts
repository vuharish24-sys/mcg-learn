import { z } from "zod";

const optionalUrl = z.union([z.url(), z.literal(""), z.null()]).optional();

export const feedItemSchema = z.object({
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(3000),
  thumbnailUrl: optionalUrl,
  categoryId: z.string().min(1),
  type: z.enum([
    "ARTICLE", "YOUTUBE", "INSTAGRAM_REEL", "PDF", "QUIZ", "CAREER_TIP",
    "ANNOUNCEMENT", "WEBINAR", "ADVERTISEMENT", "SPONSORED", "INTERNAL_PROMOTION",
    "JOB_POSTING", "COURSE",
  ]),
  externalUrl: optionalUrl,
  content: z.union([z.string(), z.record(z.string(), z.unknown()), z.null()]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  priority: z.coerce.number().int().min(0).max(100).default(0),
  isFeatured: z.coerce.boolean().default(false),
  publishedAt: z.coerce.date().nullable().optional(),
  placements: z.array(z.enum(["FEED", "LEARNING_PATH_LIST"])).min(1).default(["FEED"]),
  postedByPartnerId: z.string().trim().nullable().optional(),
});

export const feedGenerateSchema = z.object({
  topic: z.string().trim().min(3).max(300),
  // Restricted to types AI can complete end-to-end (no external video/file/schedule needed).
  type: z.enum(["ARTICLE", "CAREER_TIP", "ANNOUNCEMENT", "INTERNAL_PROMOTION", "QUIZ"]),
  categoryId: z.string().min(1),
  // When set, the item is created as DRAFT and a scheduled job publishes it at this time.
  scheduledPublishAt: z.coerce.date().nullable().optional(),
});

export const contentMapSchema = z.object({
  topic: z.string().trim().min(3).max(300),
  count: z.coerce.number().int().min(3).max(10).default(6),
});

const contentMapAngleFormat = z.enum(["ARTICLE", "CAREER_TIP", "QUIZ", "ANNOUNCEMENT", "INTERNAL_PROMOTION"]);

export const contentSeriesGenerateSchema = z.object({
  topic: z.string().trim().min(3).max(300),
  categoryId: z.string().min(1),
  angles: z
    .array(
      z.object({
        day: z.coerce.number().int().min(1),
        angle: z.string().trim().min(3).max(200),
        format: contentMapAngleFormat,
      }),
    )
    .min(1)
    .max(10),
});

export const aiProviderCreateSchema = z.object({
  providerType: z.enum(["GEMINI", "GROQ"]),
  label: z.string().trim().min(1).max(80),
  apiKey: z.string().trim().min(10).max(500),
  enabled: z.coerce.boolean().default(true),
  priority: z.coerce.number().int().min(0).max(1000).default(0),
});

export const aiProviderUpdateSchema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  apiKey: z.string().trim().max(500).optional(),
  enabled: z.coerce.boolean().optional(),
  priority: z.coerce.number().int().min(0).max(1000).optional(),
});

export const leadSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.union([z.email(), z.literal(""), z.null()]).optional(),
  phone: z.string().trim().min(7).max(20),
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "ADMITTED", "CLOSED"]).default("NEW"),
  assignedOfficerId: z.string().uuid().nullable().optional(),
  followUpAt: z.coerce.date().nullable().optional(),
  source: z.string().trim().min(2).max(100),
});

export const leadNoteSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const referralStatusSchema = z.object({
  status: z.enum(["PENDING", "QUALIFIED", "REWARDED", "REJECTED"]),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(20).optional(),
  referralCode: z.string().trim().max(40).optional(),
});

export const trainerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email(),
  phone: z.string().trim().max(20).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  experienceYears: z.coerce.number().int().min(0).max(70),
  specializations: z.array(z.string().trim().min(1)).min(1),
  availability: z.string().trim().min(2).max(200),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).default("PENDING"),
});

export const referralSchema = z.object({
  referredName: z.string().trim().min(2, "Enter the referred person’s name").max(120),
  referredEmail: z.email(),
  referredPhone: z.string().trim().min(7, "Enter a valid phone number").max(20),
});

export const joinReferralProgramSchema = z.object({
  termsAccepted: z
    .boolean()
    .refine((value) => value === true, { message: "Referral Program Terms must be accepted" }),
  privacyAccepted: z
    .boolean()
    .refine((value) => value === true, { message: "Privacy Policy must be accepted" }),
});

export const certificateSchema = z.object({
  learnerId: z.string().uuid(),
  courseName: z.string().trim().min(3).max(180),
  learnerName: z.string().trim().min(2).max(120),
  issueDate: z.coerce.date(),
});

export const advertisementSchema = z.object({
  name: z.string().trim().min(2).max(160),
  feedItemId: z.string().min(1),
  advertiser: z.string().trim().max(160).nullable().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]).default("DRAFT"),
}).refine((value) => value.endsAt > value.startsAt, {
  message: "End date must be after start date",
  path: ["endsAt"],
});

export const learningPathItemSchema = z.object({
  feedItemId: z.string().min(1),
  sortOrder: z.coerce.number().int().min(0),
  isRequired: z.coerce.boolean().default(true),
  passPercentage: z.coerce.number().int().min(0).max(100).nullable().optional(),
});

export const learningPathSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(10).max(5000),
  thumbnailUrl: optionalUrl,
  estimatedDuration: z.coerce.number().int().min(1).nullable().optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
  category: z.string().trim().min(2).max(100),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  isFeatured: z.coerce.boolean().default(false),
  requiredQuizFeedItemId: z.string().nullable().optional(),
  quizPassPercentage: z.coerce.number().int().min(0).max(100).default(60),
  certificateTemplate: z.string().trim().max(200).nullable().optional(),
  items: z.array(learningPathItemSchema).optional(),
});

export const quizAttemptSchema = z.object({
  feedItemId: z.string().min(1),
  learningPathId: z.string().nullable().optional(),
  // Selected option index per question index (both as object keys, so JSON string keys).
  // The server loads the real question/answer key from the DB and grades this itself —
  // it never trusts a client-submitted score.
  answers: z.record(z.string(), z.number().int().min(0)),
});

export const referralCampaignSchema = z.object({
  name: z.string().trim().min(2).max(180),
  shortTitle: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  campaignCode: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  registrationStartsAt: z.coerce.date().nullable().optional(),
  registrationEndsAt: z.coerce.date().nullable().optional(),
  referralStartsAt: z.coerce.date().nullable().optional(),
  referralEndsAt: z.coerce.date().nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED", "ARCHIVED"]).default("DRAFT"),
  priority: z.coerce.number().int().min(0).max(1000).default(0),
  maxReferrals: z.coerce.number().int().min(1).nullable().optional(),
  isActive: z.coerce.boolean().default(true),
  termsVersion: z.string().trim().min(1).max(40),
  commissionType: z.enum(["FLAT", "PERCENTAGE", "HYBRID"]),
  commissionBasis: z.enum([
    "COURSE_FEE",
    "ADMISSION_FEE",
    "INSTALLMENT_AMOUNT",
    "CUSTOM_AMOUNT",
  ]),
  publishAsFeed: z.coerce.boolean().default(false),
  learningPathIds: z.array(z.string().min(1)).default([]),
}).refine((value) => value.endsAt > value.startsAt, {
  message: "End date must be after start date",
  path: ["endsAt"],
});

export const referralCampaignMilestoneSchema = z.object({
  name: z.string().trim().min(2).max(160),
  sequence: z.coerce.number().int().min(1).max(999),
  trigger: z.enum([
    "ADMISSION_CONFIRMED",
    "REGISTRATION_FEE_PAID",
    "FIRST_INSTALLMENT_PAID",
    "SECOND_INSTALLMENT_PAID",
    "THIRD_INSTALLMENT_PAID",
    "FULL_FEE_PAID",
    "MANUAL",
    "MANUAL_APPROVAL",
  ]),
  calculationType: z.enum(["FLAT", "PERCENTAGE"]),
  value: z.coerce.number().min(0).max(1_000_000),
  commissionBasis: z.enum([
    "COURSE_FEE",
    "ADMISSION_FEE",
    "INSTALLMENT_AMOUNT",
    "CUSTOM_AMOUNT",
  ]).nullable().optional(),
  defaultDueDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
  defaultExpiryDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
  allowOverride: z.coerce.boolean().default(true),
  allowExtension: z.coerce.boolean().default(true),
  maxExtensionDays: z.coerce.number().int().min(0).max(3650).nullable().optional(),
  autoExpire: z.coerce.boolean().default(true),
  isActive: z.coerce.boolean().default(true),
});

export const campaignAssetSchema = z.object({
  assetType: z.enum([
    "BANNER",
    "THUMBNAIL",
    "MOBILE_BANNER",
    "PROMOTIONAL_POSTER",
    "STORY_IMAGE",
    "EMAIL_BANNER",
  ]),
  fileName: z.string().trim().min(1).max(240),
  fileUrl: z.string().url(),
  fileType: z.string().trim().max(80).nullable().optional(),
  fileSize: z.coerce.number().int().min(0).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const campaignTermsSchema = z.object({
  version: z.string().trim().min(1).max(40),
  content: z.string().trim().min(10).max(50000),
  effectiveDate: z.coerce.date(),
  isCurrent: z.coerce.boolean().default(true),
});

export const campaignFaqSchema = z.object({
  question: z.string().trim().min(3).max(500),
  answer: z.string().trim().min(3).max(5000),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const joinCampaignSchema = z.object({
  termsAccepted: z.boolean().refine((v) => v === true, { message: "Campaign terms must be accepted" }),
});

export const enrollReferralSchema = z.object({
  referralId: z.string().min(1),
  campaignId: z.string().min(1),
});

export const extendMilestoneSchema = z.object({
  newExpiryDate: z.coerce.date(),
  reason: z.string().trim().min(3).max(1000),
});

export const paymentAttachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  fileUrl: z.string().url(),
  fileType: z.enum(["image/jpeg", "image/png", "application/pdf", "JPG", "PNG", "PDF", "jpeg", "png", "pdf"]).or(z.string().min(3).max(80)),
  fileSize: z.coerce.number().int().min(0).nullable().optional(),
});
export const commissionCalculateSchema = z.object({
  referralId: z.string().min(1),
  trigger: z.enum([
    "ADMISSION_CONFIRMED",
    "REGISTRATION_FEE_PAID",
    "FIRST_INSTALLMENT_PAID",
    "SECOND_INSTALLMENT_PAID",
    "THIRD_INSTALLMENT_PAID",
    "FULL_FEE_PAID",
    "MANUAL",
    "MANUAL_APPROVAL",
  ]),
  paymentBasisAmount: z.coerce.number().min(0).max(10_000_000),
  campaignId: z.string().min(1).optional(),
  learningPathId: z.string().min(1).nullable().optional(),
  milestoneIds: z.array(z.string().min(1)).optional(),
});

export const commissionTxnStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "PAID", "REJECTED", "CANCELLED"]),
  statusReason: z.string().trim().max(1000).nullable().optional(),
});

export const commissionPaymentSchema = z.object({
  transactionId: z.string().min(1),
  paymentDate: z.coerce.date(),
  amountPaid: z.coerce.number().min(0).max(10_000_000).optional(),
  paymentMethod: z.enum(["UPI", "BANK_TRANSFER", "CASH", "CHEQUE", "OTHER"]),
  referenceNumber: z.string().trim().max(120).nullable().optional(),
  remarks: z.string().trim().max(2000).nullable().optional(),
});

// --- Placement / job board ---

/** Submitted from the public, unauthenticated job-posting page — no admin/officer role required. */
export const jobInterestSchema = z.object({
  feedItemId: z.string().min(1),
  fullName: z.string().trim().min(2).max(120),
  email: z.union([z.email(), z.literal(""), z.null()]).optional(),
  phone: z.string().trim().min(7).max(20),
  notes: z.string().trim().max(2000).optional(),
  partnerAccessCode: z.string().trim().max(100).optional(),
});

export const partnerCreateSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  logoUrl: optionalUrl,
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE"),
  accessStartsAt: z.coerce.date().nullable().optional(),
  accessEndsAt: z.coerce.date().nullable().optional(),
  contactName: z.string().trim().max(160).nullable().optional(),
  contactEmail: z.union([z.email(), z.literal(""), z.null()]).optional(),
});

export const partnerUpdateSchema = partnerCreateSchema.partial();

/**
 * Submitted from the requesting partner's own /placements page (identified
 * by their access code — partners have no login) to ask for visibility into
 * another partner's exclusive job board. Admin approves/rejects afterward.
 */
export const partnerSubscriptionRequestSchema = z.object({
  requestingAccessCode: z.string().trim().min(1),
  targetPartnerId: z.string().trim().min(1),
  contactName: z.string().trim().max(160).optional(),
  contactEmail: z.union([z.email(), z.literal(""), z.null()]).optional(),
});

export const partnerSubscriptionStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

/** Submitted from the partner's private management link — not the public student board link. */
export const partnerCandidateCreateSchema = z
  .object({
    fullName: z.string().trim().max(160).optional(),
    email: z.union([z.email(), z.literal(""), z.null()]).optional(),
    phone: z.string().trim().max(20).optional(),
  })
  .refine((v) => (v.email && v.email.trim()) || (v.phone && v.phone.trim()), {
    message: "Provide an email or phone number",
    path: ["email"],
  });

/** Submitted from the public student board to verify they're on the partner's allowlist. */
export const partnerCandidateLoginSchema = z.object({
  identifier: z.string().trim().min(3).max(160),
});

export const partnerCandidateEnrollSchema = z.object({
  enrolled: z.boolean(),
});

// --- Course benefits (coupons / scholarships / perks) ---

export const benefitCreateSchema = z
  .object({
    title: z.string().trim().min(2).max(160),
    kind: z.enum(["DISCOUNT_FLAT", "DISCOUNT_PERCENT", "PROMO_CODE", "PERK"]),
    code: z.string().trim().max(60).nullable().optional(),
    discountAmount: z.coerce.number().int().min(0).nullable().optional(),
    discountPercent: z.coerce.number().int().min(0).max(100).nullable().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    imageUrl: z.string().trim().max(500).nullable().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    isActive: z.coerce.boolean().default(true),
  })
  .refine((v) => v.kind !== "DISCOUNT_FLAT" || (v.discountAmount ?? 0) > 0, {
    message: "Discount amount is required for a flat discount",
    path: ["discountAmount"],
  })
  .refine((v) => v.kind !== "DISCOUNT_PERCENT" || (v.discountPercent ?? 0) > 0, {
    message: "Discount percent is required for a percentage discount",
    path: ["discountPercent"],
  });

export const benefitUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  kind: z.enum(["DISCOUNT_FLAT", "DISCOUNT_PERCENT", "PROMO_CODE", "PERK"]).optional(),
  code: z.string().trim().max(60).nullable().optional(),
  discountAmount: z.coerce.number().int().min(0).nullable().optional(),
  discountPercent: z.coerce.number().int().min(0).max(100).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.coerce.boolean().optional(),
});
