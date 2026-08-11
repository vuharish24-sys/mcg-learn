import { randomBytes } from "crypto";
import type { PartnerCandidate } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ACCESS_WINDOW_DAYS = 7;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function looksLikeEmail(value: string) {
  return value.includes("@");
}

export const partnerCandidateService = {
  listForPartner(partnerId: string) {
    return prisma.partnerCandidate.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
    });
  },

  async addCandidate(
    partnerId: string,
    data: { fullName?: string; email?: string; phone?: string },
  ) {
    const email = data.email?.trim() ? normalizeEmail(data.email) : null;
    const phone = data.phone?.trim() ? normalizePhone(data.phone) : null;

    const existing = await prisma.partnerCandidate.findFirst({
      where: {
        partnerId,
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });
    if (existing) return existing;

    return prisma.partnerCandidate.create({
      data: {
        partnerId,
        fullName: data.fullName?.trim() || null,
        email,
        phone,
      },
    });
  },

  findMatch(partnerId: string, identifier: string) {
    if (looksLikeEmail(identifier)) {
      return prisma.partnerCandidate.findFirst({
        where: { partnerId, email: normalizeEmail(identifier) },
      });
    }
    return prisma.partnerCandidate.findFirst({
      where: { partnerId, phone: normalizePhone(identifier) },
    });
  },

  async login(partnerId: string, identifier: string) {
    const candidate = await this.findMatch(partnerId, identifier);
    if (!candidate) return null;

    return prisma.partnerCandidate.update({
      where: { id: candidate.id },
      data: {
        firstLoginAt: candidate.firstLoginAt ?? new Date(),
        sessionToken: candidate.sessionToken ?? randomBytes(24).toString("base64url"),
      },
    });
  },

  getBySessionToken(sessionToken: string) {
    return prisma.partnerCandidate.findUnique({ where: { sessionToken } });
  },

  setEnrolled(id: string, enrolled: boolean) {
    return prisma.partnerCandidate.update({
      where: { id },
      data: { enrolledAt: enrolled ? new Date() : null },
    });
  },
};

/** True while the candidate is enrolled, or still within the 7-day window from their first login. */
export function isCandidateAccessValid(candidate: Pick<PartnerCandidate, "firstLoginAt" | "enrolledAt">) {
  if (candidate.enrolledAt) return true;
  if (!candidate.firstLoginAt) return true;
  const expiresAt = candidate.firstLoginAt.getTime() + ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() <= expiresAt;
}

export function candidateExpiresAt(candidate: Pick<PartnerCandidate, "firstLoginAt">) {
  if (!candidate.firstLoginAt) return null;
  return new Date(candidate.firstLoginAt.getTime() + ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}
