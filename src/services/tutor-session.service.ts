import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const tutorSessionService = {
  async createRequest(studentId: string, input: { trainerId: string; topic: string; preferredAt: Date; durationMinutes: number }) {
    const trainer = await prisma.trainer.findUnique({ where: { id: input.trainerId } });
    if (!trainer || trainer.status !== "ACTIVE") throw new AppValidationError("Trainer not found");
    return prisma.tutorSessionRequest.create({
      data: {
        studentId,
        trainerId: input.trainerId,
        topic: input.topic,
        preferredAt: input.preferredAt,
        durationMinutes: input.durationMinutes,
      },
    });
  },

  /** Trainer/admin quotes a price, moving the request from REQUESTED to PRICED so the student can pay. */
  async setPrice(requestId: string, priceAmountPaise: number) {
    const request = await prisma.tutorSessionRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new AppValidationError("Session request not found");
    if (request.status !== "REQUESTED") throw new AppValidationError("This request has already been priced or resolved");
    return prisma.tutorSessionRequest.update({
      where: { id: requestId },
      data: { status: "PRICED", priceAmountPaise },
    });
  },

  async decline(requestId: string, adminNotes?: string) {
    const request = await prisma.tutorSessionRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new AppValidationError("Session request not found");
    if (request.status === "CONFIRMED") throw new AppValidationError("Cannot decline a paid, confirmed session");
    return prisma.tutorSessionRequest.update({
      where: { id: requestId },
      data: { status: "DECLINED", adminNotes: adminNotes ?? request.adminNotes },
    });
  },

  listMine(studentId: string) {
    return prisma.tutorSessionRequest.findMany({
      where: { studentId },
      include: { trainer: { select: { fullName: true } }, purchase: true },
      orderBy: { createdAt: "desc" },
    });
  },

  listForTrainer(trainerId: string) {
    return prisma.tutorSessionRequest.findMany({
      where: { trainerId },
      include: { student: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  listAllPending() {
    return prisma.tutorSessionRequest.findMany({
      where: { status: { in: ["REQUESTED", "PRICED"] } },
      include: {
        student: { select: { fullName: true, email: true } },
        trainer: { select: { fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },
};
