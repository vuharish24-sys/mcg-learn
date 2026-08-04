import { randomBytes } from "crypto";
import type { Referral, ReferralStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isReferralProfileEligible } from "@/lib/referral-program";
import { referralProfileService } from "@/services/referral-profile.service";

export type AttachReferralResult =
  | { ok: true; referral: Referral }
  | { ok: false; reason: "invalid" | "already_claimed" | "self_referral"; referral?: Referral };

export const referralService = {
  list(referrerId?: string) {
    return prisma.referral.findMany({
      where: referrerId ? { referrerId } : undefined,
      include: {
        referrer: { select: { fullName: true, email: true } },
        referredUser: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  },

  async create(
    referrerId: string,
    input: { referredName: string; referredEmail: string; referredPhone: string },
  ) {
    const code = `MCG-${randomBytes(4).toString("hex").toUpperCase()}`;
    const referrer = await prisma.user.findUnique({
      where: { id: referrerId },
      select: { fullName: true, email: true },
    });

    return prisma.$transaction(async (tx) => {
      const referral = await tx.referral.create({
        data: {
          referrerId,
          referredName: input.referredName,
          referredEmail: input.referredEmail,
          referredPhone: input.referredPhone,
          code,
        },
      });

      // Also create a CRM lead so Career Officers / Admins can follow up in /crm.
      const lead = await tx.lead.create({
        data: {
          fullName: input.referredName,
          email: input.referredEmail,
          phone: input.referredPhone,
          status: "NEW",
          source: `Referral — ${referrer?.fullName ?? "Partner"} (${code})`,
        },
      });

      await tx.leadNote.create({
        data: {
          leadId: lead.id,
          authorId: referrerId,
          body: `Referral lead submitted via Referral Program. Invite code: ${code}. Partner: ${referrer?.fullName ?? referrerId}${referrer?.email ? ` <${referrer.email}>` : ""}.`,
        },
      });

      return referral;
    });
  },

  findByCode(code: string) {
    return prisma.referral.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  },

  async resolveCode(code: string) {
    const normalized = code.trim().toUpperCase();
    const referral = await this.findByCode(normalized);
    if (referral) return { type: "invite" as const, referral };

    const profile = await referralProfileService.getByCode(normalized);
    if (profile && isReferralProfileEligible(profile)) {
      return { type: "partner" as const, profile };
    }
    return null;
  },

  async attachReferredUser(
    code: string,
    userId: string,
    email: string,
  ): Promise<AttachReferralResult> {
    const normalized = code.trim().toUpperCase();
    const resolved = await this.resolveCode(normalized);

    if (!resolved) return { ok: false, reason: "invalid" };

    if (resolved.type === "partner") {
      if (resolved.profile.userId === userId) {
        return { ok: false, reason: "self_referral" };
      }

      const existingForUser = await prisma.referral.findFirst({
        where: { referredUserId: userId, referrerId: resolved.profile.userId },
      });
      if (existingForUser) return { ok: true, referral: existingForUser };

      // referredUserId is unique at the DB level, so two concurrent claims for
      // the same new user race on the create below rather than the findFirst
      // check above. Handle that race instead of letting it 500.
      const inviteCode = `MCG-${randomBytes(4).toString("hex").toUpperCase()}`;
      try {
        const referral = await prisma.referral.create({
          data: {
            referrerId: resolved.profile.userId,
            referredUserId: userId,
            referredEmail: email,
            code: inviteCode,
            status: "QUALIFIED",
          },
        });
        return { ok: true, referral };
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const winner = await prisma.referral.findUnique({ where: { referredUserId: userId } });
          if (winner?.referrerId === resolved.profile.userId) {
            return { ok: true, referral: winner };
          }
          return { ok: false, reason: "already_claimed", referral: winner ?? undefined };
        }
        throw error;
      }
    }

    const referral = resolved.referral;
    if (referral.referrerId === userId) {
      return { ok: false, reason: "self_referral", referral };
    }
    if (referral.referredUserId && referral.referredUserId !== userId) {
      return { ok: false, reason: "already_claimed", referral };
    }
    if (referral.referredUserId === userId) {
      return { ok: true, referral };
    }

    const updated = await prisma.referral.updateMany({
      where: {
        id: referral.id,
        referredUserId: null,
      },
      data: {
        referredUserId: userId,
        referredEmail: email,
        status: referral.status === "PENDING" ? "QUALIFIED" : referral.status,
      },
    });

    if (updated.count === 0) {
      const current = await prisma.referral.findUnique({ where: { id: referral.id } });
      if (current?.referredUserId === userId) return { ok: true, referral: current };
      return { ok: false, reason: "already_claimed", referral: current ?? referral };
    }

    const saved = await prisma.referral.findUniqueOrThrow({ where: { id: referral.id } });
    return { ok: true, referral: saved };
  },

  updateStatus(id: string, status: ReferralStatus) {
    return prisma.referral.update({ where: { id }, data: { status } });
  },
};
