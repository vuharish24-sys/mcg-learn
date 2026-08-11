import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function generateSecretCode() {
  return randomBytes(12).toString("base64url");
}

export const partnerService = {
  list() {
    return prisma.partner.findMany({ orderBy: { createdAt: "desc" } });
  },

  getBySlug(slug: string) {
    return prisma.partner.findUnique({ where: { slug } });
  },

  getByAccessCode(accessCode: string) {
    return prisma.partner.findUnique({ where: { accessCode } });
  },

  getByManagementCode(managementCode: string) {
    return prisma.partner.findUnique({ where: { managementCode } });
  },

  async create(data: Omit<Prisma.PartnerUncheckedCreateInput, "accessCode" | "managementCode">) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const accessCode = generateSecretCode();
      const managementCode = generateSecretCode();
      const existing = await prisma.partner.findFirst({
        where: { OR: [{ accessCode }, { managementCode }] },
      });
      if (!existing) {
        return prisma.partner.create({ data: { ...data, accessCode, managementCode } });
      }
    }
    throw new Error("Unable to generate a unique partner access code");
  },

  update(id: string, data: Prisma.PartnerUncheckedUpdateInput) {
    return prisma.partner.update({ where: { id }, data });
  },

  async regenerateAccessCode(id: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const accessCode = generateSecretCode();
      const existing = await prisma.partner.findUnique({ where: { accessCode } });
      if (!existing) {
        return prisma.partner.update({ where: { id }, data: { accessCode } });
      }
    }
    throw new Error("Unable to generate a unique partner access code");
  },

  async regenerateManagementCode(id: string) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const managementCode = generateSecretCode();
      const existing = await prisma.partner.findUnique({ where: { managementCode } });
      if (!existing) {
        return prisma.partner.update({ where: { id }, data: { managementCode } });
      }
    }
    throw new Error("Unable to generate a unique partner management code");
  },

  delete(id: string) {
    return prisma.partner.delete({ where: { id } });
  },
};

/** True while `now` falls within the partner's access window and it's ACTIVE. */
export function isPartnerAccessOpen(partner: {
  status: string;
  accessStartsAt: Date | null;
  accessEndsAt: Date | null;
}) {
  if (partner.status !== "ACTIVE") return false;
  const now = new Date();
  if (partner.accessStartsAt && partner.accessStartsAt > now) return false;
  if (partner.accessEndsAt && partner.accessEndsAt < now) return false;
  return true;
}
