/** Browser-safe commission constants and helpers (no Prisma / Node imports). */

export const REFERRAL_MILESTONE_TRIGGERS = [
  "ADMISSION_CONFIRMED",
  "REGISTRATION_FEE_PAID",
  "FIRST_INSTALLMENT_PAID",
  "SECOND_INSTALLMENT_PAID",
  "THIRD_INSTALLMENT_PAID",
  "FULL_FEE_PAID",
  "MANUAL",
  "MANUAL_APPROVAL",
] as const;

export const REFERRAL_COMMISSION_TYPES = [
  "FLAT",
  "PERCENTAGE",
  "HYBRID",
] as const;

export const REFERRAL_COMMISSION_BASES = [
  "COURSE_FEE",
  "ADMISSION_FEE",
  "INSTALLMENT_AMOUNT",
  "CUSTOM_AMOUNT",
] as const;

export const REFERRAL_MILESTONE_CALC_TYPES = [
  "FLAT",
  "PERCENTAGE",
] as const;

export const REFERRAL_COMMISSION_TXN_STATUSES = [
  "PENDING",
  "APPROVED",
  "PAID",
  "REJECTED",
  "CANCELLED",
] as const;

export const REFERRAL_PAYMENT_METHODS = [
  "UPI",
  "BANK_TRANSFER",
  "CASH",
  "CHEQUE",
  "OTHER",
] as const;

export const REFERRAL_CAMPAIGN_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ENDED",
  "ARCHIVED",
] as const;

export const REFERRAL_CAMPAIGN_ASSET_TYPES = [
  "BANNER",
  "THUMBNAIL",
  "MOBILE_BANNER",
  "PROMOTIONAL_POSTER",
  "STORY_IMAGE",
  "EMAIL_BANNER",
] as const;

export const REFERRAL_MILESTONE_STATUSES = [
  "PENDING",
  "ACHIEVED",
  "APPROVED",
  "PAID",
  "EXPIRED",
  "REJECTED",
  "CANCELLED",
] as const;

export const REFERRAL_PRIVACY_VERSION = "PRIVACY-2026-01";

export type ReferralCommissionType = (typeof REFERRAL_COMMISSION_TYPES)[number];
export type ReferralMilestoneCalcType = (typeof REFERRAL_MILESTONE_CALC_TYPES)[number];

export function calculateCommissionAmount(input: {
  calculationType: ReferralMilestoneCalcType;
  value: number | string;
  paymentBasisAmount: number | string;
}): number {
  const value = Number(input.value);
  const basis = Number(input.paymentBasisAmount);
  if (!Number.isFinite(value) || !Number.isFinite(basis) || basis < 0 || value < 0) {
    throw new Error("Commission values cannot be negative");
  }
  if (input.calculationType === "FLAT") {
    return Math.round(value * 100) / 100;
  }
  return Math.round(((basis * value) / 100) * 100) / 100;
}

export function assertMilestoneMatchesCampaignType(
  campaignType: ReferralCommissionType,
  calculationType: ReferralMilestoneCalcType,
) {
  if (campaignType === "FLAT" && calculationType !== "FLAT") {
    throw new Error("FLAT campaigns only allow FLAT milestones");
  }
  if (campaignType === "PERCENTAGE" && calculationType !== "PERCENTAGE") {
    throw new Error("PERCENTAGE campaigns only allow PERCENTAGE milestones");
  }
}
