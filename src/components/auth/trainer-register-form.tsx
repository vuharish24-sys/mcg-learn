"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a valid phone number").max(20),
  password: z.string().min(8, "Password must contain at least 8 characters"),
  bio: z.string().max(2000).optional(),
  experienceYears: z.string().min(1, "Enter years of experience"),
  specializations: z.string().min(2, "Add at least one specialization"),
  availability: z.string().min(2, "Describe your availability"),
});

type TrainerRegisterValues = z.infer<typeof schema>;

function parseSpecializations(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function TrainerRegisterForm() {
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TrainerRegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      experienceYears: "1",
      availability: "Weekdays",
    },
  });

  const onSubmit = async (values: TrainerRegisterValues) => {
    setServerError("");
    setSuccess("");

    const experienceYears = Number(values.experienceYears);
    if (!Number.isFinite(experienceYears) || experienceYears < 0 || experienceYears > 70) {
      setServerError("Enter a valid years of experience (0–70).");
      return;
    }

    const specializations = parseSpecializations(values.specializations);
    if (specializations.length === 0) {
      setServerError("Add at least one specialization (comma-separated).");
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/login?next=/trainers`;
      const email = values.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            account_type: "trainer",
            full_name: values.fullName,
            phone: values.phone,
            bio: values.bio || null,
            experience_years: experienceYears,
            specializations: specializations.join(","),
            availability: values.availability,
          },
        },
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      if (!data.user?.id) {
        setServerError("Registration did not return a user id. Try again.");
        return;
      }

      if (data.session) {
        const sync = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountType: "trainer",
            fullName: values.fullName,
            phone: values.phone,
            bio: values.bio || null,
            experienceYears,
            specializations,
            availability: values.availability,
          }),
        });
        if (!sync.ok) {
          const syncResult = await sync.json();
          setServerError(syncResult.error?.message ?? "Account created but trainer profile sync failed");
          return;
        }
      }

      setSuccess(
        data.session
          ? "Trainer account created. Your profile is pending admin activation — you can sign in now."
          : "Trainer account created. Check your email to verify, then sign in. Your profile will stay pending until an admin activates it.",
      );
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to register");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="fullName">Full name</label>
        <Input id="fullName" {...register("fullName")} />
        {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="email">Email</label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="phone">Phone</label>
        <Input id="phone" {...register("phone")} placeholder="+91 …" />
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="password">Password</label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="experienceYears">Years of experience</label>
        <Input id="experienceYears" type="number" min={0} max={70} {...register("experienceYears")} />
        {errors.experienceYears && <p className="mt-1 text-xs text-red-600">{errors.experienceYears.message}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="specializations">
          Specializations
        </label>
        <Input
          id="specializations"
          {...register("specializations")}
          placeholder="CPC, Inpatient coding, Auditing"
        />
        <p className="mt-1 text-xs text-slate-500">Comma-separated</p>
        {errors.specializations && (
          <p className="mt-1 text-xs text-red-600">{errors.specializations.message}</p>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="availability">Availability</label>
        <Input id="availability" {...register("availability")} placeholder="Weekdays / Evenings" />
        {errors.availability && (
          <p className="mt-1 text-xs text-red-600">{errors.availability.message}</p>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="bio">Bio (optional)</label>
        <Textarea id="bio" className={fieldClassName} rows={3} {...register("bio")} />
      </div>
      {serverError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{serverError}</p>}
      {success && (
        <div className="space-y-3 rounded-lg bg-teal-50 p-3 text-sm text-teal-900">
          <p>{success}</p>
          <Link href="/login?next=/trainers" className="font-semibold underline">
            Go to sign in
          </Link>
        </div>
      )}
      <Button variant="gradient" className="w-full" size="lg" disabled={isSubmitting || Boolean(success)}>
        {isSubmitting ? "Creating trainer account…" : "Create trainer account"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link href="/login?next=/trainers" className="font-semibold text-teal-700">
          Sign in
        </Link>
      </p>
      <p className="text-center text-sm text-slate-500">
        Looking for a learner account?{" "}
        <Link href="/register" className="font-semibold text-teal-700">
          Register as learner
        </Link>
      </p>
    </form>
  );
}
