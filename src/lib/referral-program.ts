import type { ReferralProfile } from "@prisma/client";

/** Current Referral Program Terms version. Bump to require re-acceptance in future. */
export const REFERRAL_TERMS_VERSION = "RP-2026-01";

export function isReferralProfileEligible(
  profile: Pick<
    ReferralProfile,
    "status" | "termsAccepted" | "privacyAccepted"
  > | null | undefined,
): boolean {
  return (
    !!profile &&
    profile.status === "ACTIVE" &&
    profile.termsAccepted === true &&
    profile.privacyAccepted === true
  );
}
