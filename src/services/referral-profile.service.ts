import { randomBytes } from "crypto";
import { AppForbiddenError, AppValidationError } from "@/lib/api";
import { REFERRAL_TERMS_VERSION, isReferralProfileEligible } from "@/lib/referral-program";
import { prisma } from "@/lib/prisma";

async function generateUniquePartnerCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const referralCode = `MCG-RP-${randomBytes(4).toString("hex").toUpperCase()}`;
    const existing = await prisma.referralProfile.findUnique({ where: { referralCode } });
    if (!existing) {
      const inviteCollision = await prisma.referral.findUnique({ where: { code: referralCode } });
      if (!inviteCollision) return referralCode;
    }
  }
  throw new Error("Unable to generate a unique referral code");
}

export const referralProfileService = {
  getByUserId(userId: string) {
    return prisma.referralProfile.findUnique({ where: { userId } });
  },

  getByCode(code: string) {
    return prisma.referralProfile.findUnique({
      where: { referralCode: code.trim().toUpperCase() },
    });
  },

  async isEligible(userId: string) {
    const profile = await this.getByUserId(userId);
    return isReferralProfileEligible(profile);
  },

  async requireEligible(userId: string) {
    const profile = await this.getByUserId(userId);
    if (!isReferralProfileEligible(profile)) {
      throw new AppForbiddenError(
        "You must join the Referral Program and accept the Terms & Privacy Policy before using referral features.",
      );
    }
    return profile!;
  },

  async join(userId: string, input: { termsAccepted: boolean; privacyAccepted: boolean }) {
    if (!input.termsAccepted || !input.privacyAccepted) {
      throw new AppValidationError(
        "You must accept the Referral Program Terms & Conditions and the Privacy Policy.",
      );
    }

    const existing = await this.getByUserId(userId);
    if (existing) {
      throw new AppValidationError("You have already joined the Referral Program.");
    }

    const now = new Date();
    const referralCode = await generateUniquePartnerCode();

    return prisma.referralProfile.create({
      data: {
        userId,
        referralCode,
        status: "ACTIVE",
        termsAccepted: true,
        termsAcceptedAt: now,
        privacyAccepted: true,
        privacyAcceptedAt: now,
        termsVersion: REFERRAL_TERMS_VERSION,
        privacyVersion: "PRIVACY-2026-01",
        joinedAt: now,
        campaignEligible: true,
      },
    });
  },
};
