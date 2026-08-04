import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

async function generateUniqueCertificateNumber() {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const certificateNumber = `MCG-${year}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const existing = await prisma.certificate.findUnique({ where: { certificateNumber } });
    if (!existing) return certificateNumber;
  }
  throw new Error("Unable to generate a unique certificate number");
}

export const certificateService = {
  list(learnerId?: string) {
    return prisma.certificate.findMany({
      where: learnerId ? { learnerId } : undefined,
      include: { learner: { select: { fullName: true, email: true } } },
      orderBy: { issueDate: "desc" },
      take: 100,
    });
  },
  async create(data: Omit<Prisma.CertificateUncheckedCreateInput, "certificateNumber">) {
    const certificateNumber = await generateUniqueCertificateNumber();
    return prisma.certificate.create({ data: { ...data, certificateNumber } });
  },
  findByCertificateNumber(certificateNumber: string) {
    return prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        learner: { select: { fullName: true, email: true } },
        learningPath: { select: { title: true, slug: true } },
      },
    });
  },
  listAchievements(learnerId: string) {
    return prisma.certificate.findMany({
      where: { learnerId },
      include: { learningPath: { select: { title: true, slug: true, thumbnailUrl: true } } },
      orderBy: { issueDate: "desc" },
    });
  },
};
