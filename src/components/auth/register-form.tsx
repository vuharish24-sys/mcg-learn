"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must contain at least 8 characters"),
  referralCode: z.string().optional(),
});

type RegisterValues = z.infer<typeof schema>;

export function RegisterForm() {
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      referralCode: searchParams.get("ref") ?? "",
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setServerError("");
    setSuccess("");

    const referralCode = (values.referralCode || searchParams.get("ref") || "").trim().toUpperCase();
    if (referralCode) {
      const validation = await fetch(`/api/v1/referrals/validate?code=${encodeURIComponent(referralCode)}`);
      const validationResult = await validation.json();
      if (!validation.ok) {
        setServerError(validationResult.error?.message ?? "Invalid referral code");
        return;
      }
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/login${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""}`;
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: values.fullName,
            phone: values.phone ?? null,
            referral_code: referralCode || null,
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

      if (referralCode) {
        window.localStorage.setItem("mcg_referral_code", referralCode);
      }

      if (data.session) {
        const sync = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: values.fullName,
            phone: values.phone || null,
            referralCode: referralCode || undefined,
          }),
        });
        if (!sync.ok) {
          const syncResult = await sync.json();
          setServerError(syncResult.error?.message ?? "Account created but profile sync failed");
          return;
        }
      }

      setSuccess(
        data.session
          ? "Account created. You can sign in now."
          : "Account created. Check your email to verify your address before signing in.",
      );
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to register");
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
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
        <Input id="phone" {...register("phone")} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="password">Password</label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="referralCode">Referral code</label>
        <Input id="referralCode" {...register("referralCode")} placeholder="Optional" />
      </div>
      {serverError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{serverError}</p>}
      {success && (
        <div className="space-y-3 rounded-lg bg-teal-50 p-3 text-sm text-teal-900">
          <p>{success}</p>
          <Link href="/login" className="font-semibold underline">Go to sign in</Link>
        </div>
      )}
      <Button variant="gradient" className="w-full" size="lg" disabled={isSubmitting || Boolean(success)}>
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal-700">Sign in</Link>
      </p>
      <p className="text-center text-sm text-slate-500">
        Are you a trainer?{" "}
        <Link href="/register/trainer" className="font-semibold text-teal-700">
          Register as a trainer
        </Link>
      </p>
    </form>
  );
}
