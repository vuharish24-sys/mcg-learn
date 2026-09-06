import type { TrainerCompensationType } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

function sessionAmountPaise(compensationType: TrainerCompensationType, rateAmountPaise: number, durationMinutes: number) {
  if (compensationType === "HOURLY") return Math.round((rateAmountPaise * durationMinutes) / 60);
  return rateAmountPaise; // FLAT_PER_SESSION
}

const assignmentWithModule = {
  courseModule: { include: { feedItem: { select: { id: true, title: true } } } },
  trainer: true,
} as const;

export const trainerProgramService = {
  // ---- Modules ----
  listModulesForCourse(feedItemId: string) {
    return prisma.courseModule.findMany({ where: { feedItemId }, orderBy: { sortOrder: "asc" } });
  },

  listAllModulesForBrowsing() {
    return prisma.courseModule.findMany({
      include: { feedItem: { select: { id: true, title: true } } },
      orderBy: [{ feedItemId: "asc" }, { sortOrder: "asc" }],
    });
  },

  findModule(id: string) {
    return prisma.courseModule.findUnique({ where: { id }, include: { feedItem: { select: { id: true, title: true } } } });
  },

  createModule(input: { feedItemId: string; title: string; description?: string; contentUrl?: string | null; sortOrder: number }) {
    return prisma.courseModule.create({ data: input });
  },

  async updateModule(id: string, input: { title?: string; description?: string | null; contentUrl?: string | null; sortOrder?: number }) {
    const existing = await prisma.courseModule.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Module not found");
    return prisma.courseModule.update({ where: { id }, data: input });
  },

  async deleteModule(id: string) {
    const existing = await prisma.courseModule.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Module not found");
    await prisma.courseModule.delete({ where: { id } });
  },

  // ---- Assignments ----
  listAllAssignments() {
    return prisma.trainerAssignment.findMany({
      include: assignmentWithModule,
      orderBy: { createdAt: "desc" },
    });
  },

  listAssignmentsForTrainer(trainerId: string) {
    return prisma.trainerAssignment.findMany({
      where: { trainerId },
      include: assignmentWithModule,
      orderBy: { createdAt: "desc" },
    });
  },

  async createAssignment(input: { trainerId: string; courseModuleId: string; compensationType: TrainerCompensationType; rateAmountPaise: number }) {
    const trainer = await prisma.trainer.findUnique({ where: { id: input.trainerId } });
    if (!trainer) throw new AppValidationError("Trainer not found");
    const courseModule = await prisma.courseModule.findUnique({ where: { id: input.courseModuleId } });
    if (!courseModule) throw new AppValidationError("Module not found");
    return prisma.trainerAssignment.create({ data: input });
  },

  async setAssignmentActive(id: string, isActive: boolean) {
    const existing = await prisma.trainerAssignment.findUnique({ where: { id } });
    if (!existing) throw new AppValidationError("Assignment not found");
    return prisma.trainerAssignment.update({ where: { id }, data: { isActive } });
  },

  // ---- Proposals ----
  listProposalsForTrainer(trainerId: string) {
    return prisma.trainerProposal.findMany({ where: { trainerId }, orderBy: { createdAt: "desc" } });
  },

  listAllProposals() {
    return prisma.trainerProposal.findMany({
      include: { trainer: true, targetCourse: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  createProposal(input: {
    trainerId: string;
    title: string;
    description: string;
    targetCourseId?: string | null;
    proposedCompensationType: TrainerCompensationType;
    proposedRateAmountPaise: number;
  }) {
    return prisma.trainerProposal.create({ data: input });
  },

  async decideProposal(
    id: string,
    decision:
      | { status: "APPROVED"; adminNotes?: string; targetCourseId: string; finalCompensationType: TrainerCompensationType; finalRateAmountPaise: number }
      | { status: "REJECTED" | "NEEDS_REVISION"; adminNotes?: string },
  ) {
    const proposal = await prisma.trainerProposal.findUnique({ where: { id } });
    if (!proposal) throw new AppValidationError("Proposal not found");
    if (proposal.status !== "PENDING") throw new AppValidationError("This proposal has already been decided");

    if (decision.status !== "APPROVED") {
      return prisma.trainerProposal.update({
        where: { id },
        data: { status: decision.status, adminNotes: decision.adminNotes },
      });
    }

    return prisma.$transaction(async (tx) => {
      const courseModule = await tx.courseModule.create({
        data: {
          feedItemId: decision.targetCourseId,
          title: proposal.title,
          description: proposal.description,
          sortOrder: 0,
        },
      });
      await tx.trainerAssignment.create({
        data: {
          trainerId: proposal.trainerId,
          courseModuleId: courseModule.id,
          compensationType: decision.finalCompensationType,
          rateAmountPaise: decision.finalRateAmountPaise,
        },
      });
      return tx.trainerProposal.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNotes: decision.adminNotes,
          resultingModuleId: courseModule.id,
          targetCourseId: decision.targetCourseId,
        },
      });
    });
  },

  // ---- Teach requests ----
  listTeachRequestsForTrainer(trainerId: string) {
    return prisma.moduleTeachRequest.findMany({
      where: { trainerId },
      include: { courseModule: { include: { feedItem: { select: { title: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  },

  listAllTeachRequests() {
    return prisma.moduleTeachRequest.findMany({
      where: { status: "PENDING" },
      include: { trainer: true, courseModule: { include: { feedItem: { select: { title: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async createTeachRequest(input: { trainerId: string; courseModuleId: string; proposedCompensationType: TrainerCompensationType; proposedRateAmountPaise: number }) {
    const courseModule = await prisma.courseModule.findUnique({ where: { id: input.courseModuleId } });
    if (!courseModule) throw new AppValidationError("Module not found");
    return prisma.moduleTeachRequest.create({ data: input });
  },

  async decideTeachRequest(
    id: string,
    decision: { status: "APPROVED"; finalCompensationType: TrainerCompensationType; finalRateAmountPaise: number } | { status: "REJECTED" },
  ) {
    const request = await prisma.moduleTeachRequest.findUnique({ where: { id } });
    if (!request) throw new AppValidationError("Request not found");
    if (request.status !== "PENDING") throw new AppValidationError("This request has already been decided");

    if (decision.status === "REJECTED") {
      return prisma.moduleTeachRequest.update({ where: { id }, data: { status: "REJECTED", decidedAt: new Date() } });
    }

    return prisma.$transaction(async (tx) => {
      await tx.trainerAssignment.create({
        data: {
          trainerId: request.trainerId,
          courseModuleId: request.courseModuleId,
          compensationType: decision.finalCompensationType,
          rateAmountPaise: decision.finalRateAmountPaise,
        },
      });
      return tx.moduleTeachRequest.update({ where: { id }, data: { status: "APPROVED", decidedAt: new Date() } });
    });
  },

  // ---- Class sessions ----
  async logClassSession(requestingTrainerId: string, input: {
    trainerAssignmentId: string;
    scheduledAt: Date;
    durationMinutes: number;
    meetingUrl?: string | null;
    notes?: string;
    attendeeStudentIds: string[];
  }) {
    const assignment = await prisma.trainerAssignment.findUnique({ where: { id: input.trainerAssignmentId } });
    if (!assignment) throw new AppValidationError("Assignment not found");
    if (assignment.trainerId !== requestingTrainerId) throw new AppValidationError("Not authorized");
    if (assignment.compensationType !== "HOURLY" && assignment.compensationType !== "FLAT_PER_SESSION") {
      throw new AppValidationError("This assignment isn't a teaching assignment");
    }

    return prisma.classSession.create({
      data: {
        trainerAssignmentId: input.trainerAssignmentId,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        meetingUrl: input.meetingUrl || null,
        notes: input.notes,
        attendances: { create: input.attendeeStudentIds.map((studentId) => ({ studentId })) },
      },
      include: { attendances: true },
    });
  },

  listSessionsForAssignment(trainerAssignmentId: string) {
    return prisma.classSession.findMany({
      where: { trainerAssignmentId },
      include: { attendances: { include: { student: { select: { fullName: true, email: true } } } } },
      orderBy: { scheduledAt: "desc" },
    });
  },

  listPendingConfirmationsForStudent(studentId: string) {
    return prisma.classSessionAttendance.findMany({
      where: { studentId, confirmed: false },
      include: {
        classSession: {
          include: { trainerAssignment: { include: assignmentWithModule } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /** Student confirms they attended — first confirmation on a session makes it payable. */
  async confirmAttendance(studentId: string, attendanceId: string) {
    const attendance = await prisma.classSessionAttendance.findUnique({
      where: { id: attendanceId },
      include: { classSession: { include: { trainerAssignment: true } } },
    });
    if (!attendance) throw new AppValidationError("Attendance record not found");
    if (attendance.studentId !== studentId) throw new AppValidationError("Not authorized");
    if (attendance.confirmed) return attendance;

    return prisma.$transaction(async (tx) => {
      await tx.classSessionAttendance.update({
        where: { id: attendanceId },
        data: { confirmed: true, confirmedAt: new Date() },
      });

      const session = attendance.classSession;
      if (session.status === "PENDING_CONFIRMATION") {
        await tx.classSession.update({ where: { id: session.id }, data: { status: "CONFIRMED" } });
        const assignment = session.trainerAssignment;
        const amountPaise = sessionAmountPaise(assignment.compensationType, assignment.rateAmountPaise, session.durationMinutes);
        await tx.trainerPayoutLineItem.create({
          data: {
            trainerId: assignment.trainerId,
            sourceType: "CLASS_SESSION",
            classSessionId: session.id,
            amountPaise,
          },
        });
      }
      return tx.classSessionAttendance.findUniqueOrThrow({ where: { id: attendanceId } });
    });
  },

  // ---- Deliverables ----
  async submitDeliverable(requestingTrainerId: string, input: { trainerAssignmentId: string; title: string; description?: string; fileUrl?: string | null }) {
    const assignment = await prisma.trainerAssignment.findUnique({ where: { id: input.trainerAssignmentId } });
    if (!assignment) throw new AppValidationError("Assignment not found");
    if (assignment.trainerId !== requestingTrainerId) throw new AppValidationError("Not authorized");
    if (assignment.compensationType !== "FLAT_PER_DELIVERABLE") {
      throw new AppValidationError("This assignment isn't a deliverable assignment");
    }
    return prisma.deliverable.create({ data: input });
  },

  listDeliverablesForAssignment(trainerAssignmentId: string) {
    return prisma.deliverable.findMany({ where: { trainerAssignmentId }, orderBy: { createdAt: "desc" } });
  },

  listPendingDeliverables() {
    return prisma.deliverable.findMany({
      where: { status: "SUBMITTED" },
      include: { trainerAssignment: { include: assignmentWithModule } },
      orderBy: { createdAt: "asc" },
    });
  },

  async decideDeliverable(id: string, decision: { status: "APPROVED" | "REJECTED" | "NEEDS_REVISION"; adminNotes?: string }) {
    const deliverable = await prisma.deliverable.findUnique({ where: { id }, include: { trainerAssignment: true } });
    if (!deliverable) throw new AppValidationError("Deliverable not found");
    if (deliverable.status !== "SUBMITTED") throw new AppValidationError("This deliverable has already been decided");

    if (decision.status !== "APPROVED") {
      return prisma.deliverable.update({ where: { id }, data: { status: decision.status, adminNotes: decision.adminNotes } });
    }

    return prisma.$transaction(async (tx) => {
      await tx.trainerPayoutLineItem.create({
        data: {
          trainerId: deliverable.trainerAssignment.trainerId,
          sourceType: "DELIVERABLE",
          deliverableId: id,
          amountPaise: deliverable.trainerAssignment.rateAmountPaise,
        },
      });
      return tx.deliverable.update({ where: { id }, data: { status: "APPROVED", adminNotes: decision.adminNotes } });
    });
  },

  // ---- Module completion & usage payouts ----
  async markModuleComplete(userId: string, courseModuleId: string) {
    const courseModule = await prisma.courseModule.findUnique({ where: { id: courseModuleId } });
    if (!courseModule) throw new AppValidationError("Module not found");
    const enrolled = await prisma.courseEnrollment.findUnique({
      where: { userId_feedItemId: { userId, feedItemId: courseModule.feedItemId } },
    });
    if (!enrolled) throw new AppValidationError("Enroll in this course to access its modules");

    const existing = await prisma.userModuleCompletion.findUnique({
      where: { userId_courseModuleId: { userId, courseModuleId } },
    });
    if (existing) return existing;

    return prisma.$transaction(async (tx) => {
      const completion = await tx.userModuleCompletion.create({ data: { userId, courseModuleId } });

      const usageAssignments = await tx.trainerAssignment.findMany({
        where: { courseModuleId, compensationType: "PER_STUDENT_USE", isActive: true },
      });
      for (const assignment of usageAssignments) {
        const alreadyUsed = await tx.contentUsageEvent.findUnique({
          where: { trainerAssignmentId_studentId: { trainerAssignmentId: assignment.id, studentId: userId } },
        });
        if (alreadyUsed) continue;
        const usageEvent = await tx.contentUsageEvent.create({
          data: { trainerAssignmentId: assignment.id, studentId: userId, amountPaise: assignment.rateAmountPaise },
        });
        await tx.trainerPayoutLineItem.create({
          data: {
            trainerId: assignment.trainerId,
            sourceType: "CONTENT_USAGE",
            contentUsageEventId: usageEvent.id,
            amountPaise: assignment.rateAmountPaise,
          },
        });
      }
      return completion;
    });
  },

  // ---- Payout ledger ----
  listPayoutLineItems(status?: "PENDING" | "APPROVED" | "PAID" | "REJECTED") {
    return prisma.trainerPayoutLineItem.findMany({
      where: status ? { status } : undefined,
      include: { trainer: true },
      orderBy: { createdAt: "asc" },
    });
  },

  listPayoutLineItemsForTrainer(trainerId: string) {
    return prisma.trainerPayoutLineItem.findMany({ where: { trainerId }, orderBy: { createdAt: "desc" } });
  },

  async approvePayoutLineItem(id: string) {
    const item = await prisma.trainerPayoutLineItem.findUnique({ where: { id } });
    if (!item) throw new AppValidationError("Payout line item not found");
    if (item.status !== "PENDING") throw new AppValidationError("This item isn't pending");
    return prisma.trainerPayoutLineItem.update({ where: { id }, data: { status: "APPROVED", approvedAt: new Date() } });
  },

  async markPayoutLineItemPaid(id: string, paymentReference?: string) {
    const item = await prisma.trainerPayoutLineItem.findUnique({ where: { id } });
    if (!item) throw new AppValidationError("Payout line item not found");
    if (item.status !== "APPROVED") throw new AppValidationError("This item must be approved before it can be marked paid");
    return prisma.trainerPayoutLineItem.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date(), paymentReference },
    });
  },
};
