"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LEARNING_MODES,
  profileUpdateSchema,
  type ProfileUpdateFormValues,
  type ProfileUpdateInput,
} from "@/lib/profile";

const QUALIFICATION_SUGGESTIONS = [
  "High school / 12th",
  "Diploma in Nursing",
  "B.Sc Nursing",
  "GNM",
  "B.Pharm",
  "D.Pharm",
  "MBBS",
  "BPT",
  "Allied Health Diploma",
  "Bachelor's degree (other)",
  "Master's degree",
];

type ProfileFormProps = {
  initial: {
    fullName: string;
    phone: string | null;
    dateOfBirth: string;
    qualification: string | null;
    fieldOfStudy: string | null;
    yearsExperience: number | null;
    careerGoal: string | null;
    preferredLearningMode: string | null;
    city: string | null;
    country: string | null;
    advisingNotes: string | null;
    email: string;
  };
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileUpdateFormValues, unknown, ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      fullName: initial.fullName,
      phone: initial.phone ?? "",
      dateOfBirth: initial.dateOfBirth || "",
      qualification: initial.qualification ?? "",
      fieldOfStudy: initial.fieldOfStudy ?? "",
      yearsExperience: initial.yearsExperience ?? undefined,
      careerGoal: initial.careerGoal ?? "",
      preferredLearningMode: (initial.preferredLearningMode || "") as ProfileUpdateInput["preferredLearningMode"],
      city: initial.city ?? "",
      country: initial.country ?? "",
      advisingNotes: initial.advisingNotes ?? "",
    },
  });

  const onSubmit = async (values: ProfileUpdateInput) => {
    setServerError("");
    setSuccess("");
    const response = await fetch("/api/v1/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload = await response.json();
    if (!response.ok) {
      setServerError(payload.error?.message ?? "Unable to update profile");
      return;
    }
    setSuccess("Profile saved. Advisors can use this to recommend courses.");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Full name</span>
          <Input {...register("fullName")} autoComplete="name" />
          {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Email</span>
          <Input value={initial.email} disabled readOnly className="bg-slate-50" />
          <p className="text-xs text-slate-500">Email is managed by your login account.</p>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Phone</span>
          <Input {...register("phone")} autoComplete="tel" placeholder="+91…" />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Date of birth</span>
          <Input type="date" {...register("dateOfBirth")} />
          {errors.dateOfBirth && (
            <p className="text-xs text-red-600">{errors.dateOfBirth.message}</p>
          )}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Highest qualification</span>
          <Input
            list="qualification-suggestions"
            {...register("qualification")}
            placeholder="e.g. B.Sc Nursing"
          />
          <datalist id="qualification-suggestions">
            {QUALIFICATION_SUGGESTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          {errors.qualification && (
            <p className="text-xs text-red-600">{errors.qualification.message}</p>
          )}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Field of study / background</span>
          <Input
            {...register("fieldOfStudy")}
            placeholder="e.g. Nursing, Pharmacy, Life sciences"
          />
          {errors.fieldOfStudy && (
            <p className="text-xs text-red-600">{errors.fieldOfStudy.message}</p>
          )}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Years of experience</span>
          <Input
            type="number"
            min={0}
            max={70}
            {...register("yearsExperience")}
            placeholder="0"
          />
          {errors.yearsExperience && (
            <p className="text-xs text-red-600">{errors.yearsExperience.message}</p>
          )}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Preferred learning mode</span>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register("preferredLearningMode")}
          >
            <option value="">Select…</option>
            {LEARNING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          {errors.preferredLearningMode && (
            <p className="text-xs text-red-600">{errors.preferredLearningMode.message}</p>
          )}
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">City</span>
          <Input {...register("city")} autoComplete="address-level2" />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Country</span>
          <Input {...register("country")} autoComplete="country-name" placeholder="India" />
        </label>

        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Career goal</span>
          <textarea
            className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register("careerGoal")}
            placeholder="e.g. Become a CPC-certified medical coder and join a US billing team"
          />
          {errors.careerGoal && (
            <p className="text-xs text-red-600">{errors.careerGoal.message}</p>
          )}
        </label>

        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Anything else for course advising?</span>
          <textarea
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register("advisingNotes")}
            placeholder="Schedule constraints, exam timeline, preferred specialty…"
          />
          {errors.advisingNotes && (
            <p className="text-xs text-red-600">{errors.advisingNotes.message}</p>
          )}
        </label>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {success && <p className="text-sm text-teal-700">{success}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
