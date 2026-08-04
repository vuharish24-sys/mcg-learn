import { z } from "zod";

const emptyToNull = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const optionalText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

export const LEARNING_MODES = [
  "ONLINE",
  "HYBRID",
  "IN_PERSON",
  "SELF_PACED",
] as const;

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.preprocess(emptyToNull, z.string().trim().min(7).max(20).nullable().optional()),
  dateOfBirth: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .nullable()
      .optional(),
  ),
  qualification: optionalText(160),
  fieldOfStudy: optionalText(160),
  yearsExperience: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return null;
      return value;
    },
    z.coerce.number().int().min(0).max(70).nullable().optional(),
  ),
  careerGoal: optionalText(500),
  preferredLearningMode: z.preprocess(
    emptyToNull,
    z.enum(LEARNING_MODES).nullable().optional(),
  ),
  city: optionalText(80),
  country: optionalText(80),
  advisingNotes: optionalText(1000),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ProfileUpdateFormValues = z.input<typeof profileUpdateSchema>;
