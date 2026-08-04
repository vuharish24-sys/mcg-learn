import { prisma } from "@/lib/prisma";
import type { ProfileUpdateInput } from "@/lib/profile";

function parseDateOnly(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date of birth");
  }
  return date;
}

export function toDateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function getProfileCompleteness(user: {
  fullName: string;
  phone: string | null;
  dateOfBirth: Date | null;
  qualification: string | null;
  fieldOfStudy: string | null;
  yearsExperience: number | null;
  careerGoal: string | null;
  preferredLearningMode: string | null;
  city: string | null;
  country: string | null;
}) {
  const checks = [
    Boolean(user.fullName?.trim()),
    Boolean(user.phone?.trim()),
    Boolean(user.dateOfBirth),
    Boolean(user.qualification?.trim()),
    Boolean(user.fieldOfStudy?.trim()),
    user.yearsExperience !== null && user.yearsExperience !== undefined,
    Boolean(user.careerGoal?.trim()),
    Boolean(user.preferredLearningMode?.trim()),
    Boolean(user.city?.trim() || user.country?.trim()),
  ];
  const completed = checks.filter(Boolean).length;
  return {
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
    isReadyForAdvising: completed >= 6,
  };
}

export const profileService = {
  getById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        dateOfBirth: true,
        qualification: true,
        fieldOfStudy: true,
        yearsExperience: true,
        careerGoal: true,
        preferredLearningMode: true,
        city: true,
        country: true,
        advisingNotes: true,
        updatedAt: true,
        role: { select: { key: true, name: true } },
      },
    });
  },

  update(userId: string, input: ProfileUpdateInput) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName,
        phone: input.phone === undefined ? undefined : input.phone,
        dateOfBirth: parseDateOnly(input.dateOfBirth),
        qualification: input.qualification === undefined ? undefined : input.qualification,
        fieldOfStudy: input.fieldOfStudy === undefined ? undefined : input.fieldOfStudy,
        yearsExperience: input.yearsExperience === undefined ? undefined : input.yearsExperience,
        careerGoal: input.careerGoal === undefined ? undefined : input.careerGoal,
        preferredLearningMode:
          input.preferredLearningMode === undefined ? undefined : input.preferredLearningMode,
        city: input.city === undefined ? undefined : input.city,
        country: input.country === undefined ? undefined : input.country,
        advisingNotes: input.advisingNotes === undefined ? undefined : input.advisingNotes,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        dateOfBirth: true,
        qualification: true,
        fieldOfStudy: true,
        yearsExperience: true,
        careerGoal: true,
        preferredLearningMode: true,
        city: true,
        country: true,
        advisingNotes: true,
        updatedAt: true,
      },
    });
  },
};
