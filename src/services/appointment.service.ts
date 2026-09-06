import { Prisma } from "@prisma/client";
import { AppValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { notifyAppointmentBooked, notifyAppointmentCancelled } from "@/lib/notifications/appointment-notifications";

const HOST_ROLES = ["CAREER_OFFICER", "TRAINER"];

const personSelect = { fullName: true, email: true, phone: true } as const;

type AvailabilityRule = {
  id: string;
  hostId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  meetingUrl: string | null;
  notes: string | null;
};

/** Every slot start time a rule implies within [windowStart, windowEnd), regardless of what already exists. */
function computeSlotStarts(rule: AvailabilityRule, windowStart: Date, windowEnd: Date): Date[] {
  const [startH, startM] = rule.startTime.split(":").map(Number);
  const [endH, endM] = rule.endTime.split(":").map(Number);
  const durationMs = rule.slotDurationMinutes * 60_000;
  const starts: Date[] = [];

  const day = new Date(windowStart);
  day.setHours(0, 0, 0, 0);

  while (day <= windowEnd) {
    if (rule.daysOfWeek.includes(day.getDay())) {
      const dayEnd = new Date(day);
      dayEnd.setHours(endH, endM, 0, 0);
      let slotStart = new Date(day);
      slotStart.setHours(startH, startM, 0, 0);

      while (slotStart.getTime() + durationMs <= dayEnd.getTime()) {
        if (slotStart >= windowStart && slotStart <= windowEnd) starts.push(new Date(slotStart));
        slotStart = new Date(slotStart.getTime() + durationMs);
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return starts;
}

export const appointmentService = {
  /** Open, upcoming slots any learner can book — across every host. */
  listOpenSlots() {
    return prisma.appointmentSlot.findMany({
      where: { startsAt: { gt: new Date() }, appointment: null },
      include: { host: { select: { ...personSelect, role: { select: { key: true } } } } },
      orderBy: { startsAt: "asc" },
    });
  },

  /** A host's own slots (open, booked, and cancelled), for their availability page. */
  listHostSlots(hostId: string) {
    return prisma.appointmentSlot.findMany({
      where: { hostId },
      include: { appointment: { include: { learner: { select: personSelect } } } },
      orderBy: { startsAt: "asc" },
    });
  },

  /** A learner's own bookings, most imminent first. */
  listLearnerAppointments(learnerId: string) {
    return prisma.appointment.findMany({
      where: { learnerId },
      include: { slot: { include: { host: { select: personSelect } } } },
      orderBy: { slot: { startsAt: "asc" } },
    });
  },

  async createSlot(host: { id: string; roleKey: string }, input: { startsAt: Date; endsAt: Date; meetingUrl?: string | null; notes?: string }) {
    if (!HOST_ROLES.includes(host.roleKey)) {
      throw new AppValidationError("Only Career Officers and Trainers can open appointment slots");
    }
    return prisma.appointmentSlot.create({
      data: {
        hostId: host.id,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        meetingUrl: input.meetingUrl || null,
        notes: input.notes,
      },
    });
  },

  /** Removes a slot outright — only allowed while it's never been booked. */
  async deleteSlot(hostId: string, slotId: string) {
    const slot = await prisma.appointmentSlot.findUnique({ where: { id: slotId }, include: { appointment: true } });
    if (!slot) throw new AppValidationError("Slot not found");
    if (slot.hostId !== hostId) throw new AppValidationError("Not authorized to remove this slot");
    if (slot.appointment) throw new AppValidationError("This slot has already been booked — cancel the appointment instead");
    await prisma.appointmentSlot.delete({ where: { id: slotId } });
  },

  async book(learnerId: string, slotId: string, learnerNotes?: string) {
    const slot = await prisma.appointmentSlot.findUnique({
      where: { id: slotId },
      include: { host: { select: personSelect } },
    });
    if (!slot) throw new AppValidationError("Slot not found");
    if (slot.startsAt.getTime() <= Date.now()) throw new AppValidationError("This slot has already passed");
    if (slot.hostId === learnerId) throw new AppValidationError("You can't book your own slot");

    let appointment;
    try {
      appointment = await prisma.appointment.create({
        data: { slotId, learnerId, learnerNotes },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppValidationError("This slot was just booked by someone else — please pick another.");
      }
      throw error;
    }

    const learner = await prisma.user.findUnique({ where: { id: learnerId }, select: personSelect });
    if (learner) {
      notifyAppointmentBooked({
        startsAt: slot.startsAt,
        meetingUrl: slot.meetingUrl,
        learner,
        host: slot.host,
      }).catch((error) => console.error("Appointment-booked notification failed", error));
    }

    return appointment;
  },

  async cancel(userId: string, appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: { include: { host: { select: personSelect } } }, learner: { select: personSelect } },
    });
    if (!appointment) throw new AppValidationError("Appointment not found");
    if (appointment.status !== "BOOKED") throw new AppValidationError("This appointment is already cancelled");
    if (appointment.learnerId !== userId && appointment.slot.hostId !== userId) {
      throw new AppValidationError("Not authorized to cancel this appointment");
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    notifyAppointmentCancelled({
      startsAt: appointment.slot.startsAt,
      meetingUrl: appointment.slot.meetingUrl,
      learner: appointment.learner,
      host: appointment.slot.host,
    }).catch((error) => console.error("Appointment-cancelled notification failed", error));

    return updated;
  },

  listAvailabilityRules(hostId: string) {
    return prisma.availabilityRule.findMany({ where: { hostId }, orderBy: { createdAt: "desc" } });
  },

  /** Materializes real AppointmentSlot rows for a rule across [now, now + weeksAhead]. Skips any start time that already has a slot for this host. Returns how many were newly created. */
  async generateSlotsFromRule(hostId: string, ruleId: string, weeksAhead: number) {
    const rule = await prisma.availabilityRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new AppValidationError("Availability rule not found");
    if (rule.hostId !== hostId) throw new AppValidationError("Not authorized");

    const windowStart = new Date();
    const windowEnd = new Date(Date.now() + weeksAhead * 7 * 24 * 60 * 60 * 1000);
    const starts = computeSlotStarts(rule, windowStart, windowEnd);
    const durationMs = rule.slotDurationMinutes * 60_000;

    const existing = await prisma.appointmentSlot.findMany({
      where: { hostId, startsAt: { in: starts } },
      select: { startsAt: true },
    });
    const existingTimes = new Set(existing.map((s) => s.startsAt.getTime()));
    const toCreate = starts.filter((s) => !existingTimes.has(s.getTime()));

    if (toCreate.length > 0) {
      await prisma.appointmentSlot.createMany({
        data: toCreate.map((startsAt) => ({
          hostId,
          startsAt,
          endsAt: new Date(startsAt.getTime() + durationMs),
          meetingUrl: rule.meetingUrl,
          notes: rule.notes,
        })),
      });
    }
    return toCreate.length;
  },

  async createAvailabilityRule(
    host: { id: string; roleKey: string },
    input: {
      daysOfWeek: number[];
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
      meetingUrl?: string | null;
      notes?: string;
      generateWeeksAhead: number;
    },
  ) {
    if (!HOST_ROLES.includes(host.roleKey)) {
      throw new AppValidationError("Only Career Officers and Trainers can set up availability");
    }
    const rule = await prisma.availabilityRule.create({
      data: {
        hostId: host.id,
        daysOfWeek: input.daysOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotDurationMinutes: input.slotDurationMinutes,
        meetingUrl: input.meetingUrl || null,
        notes: input.notes,
      },
    });
    const createdCount = await this.generateSlotsFromRule(host.id, rule.id, input.generateWeeksAhead);
    return { rule, createdCount };
  },

  /** Deletes the rule itself — already-generated slots are unaffected. */
  async deleteAvailabilityRule(hostId: string, ruleId: string) {
    const rule = await prisma.availabilityRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new AppValidationError("Availability rule not found");
    if (rule.hostId !== hostId) throw new AppValidationError("Not authorized");
    await prisma.availabilityRule.delete({ where: { id: ruleId } });
  },
};
