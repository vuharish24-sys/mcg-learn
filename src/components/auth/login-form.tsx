"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must contain at least 8 characters"),
});

type LoginValues = z.infer<typeof schema>;

function safeNextPath(value: string | null) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";
  if (value.startsWith("/login") || value.startsWith("/register")) return "/dashboard";
  return value;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");
  const inactive = searchParams.get("reason") === "inactive";
  const [serverError, setServerError] = useState(
    inactive ? "Your account is inactive. Contact an administrator." : "",
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!inactive) return;
    void createSupabaseBrowserClient().auth.signOut();
  }, [inactive]);

  const onSubmit = async (values: LoginValues) => {
    setServerError("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword(values);
      if (error) {
        setServerError(error.message);
        return;
      }

      // Complete learner/trainer profile sync (role + trainer row from signup metadata).
      await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const storedReferral =
        referralCode ??
        (typeof window !== "undefined" ? window.localStorage.getItem("mcg_referral_code") : null);

      if (storedReferral) {
        const claim = await fetch("/api/v1/referrals/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: storedReferral }),
        });
        if (claim.ok) {
          window.localStorage.removeItem("mcg_referral_code");
        }
      }

      router.replace(safeNextPath(searchParams.get("next")));
      router.refresh();
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Unable to sign in");
    }
  };

  const registerHref = referralCode ? `/register?ref=${encodeURIComponent(referralCode)}` : "/register";

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      {referralCode && (
        <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">
          Referral code detected: <span className="font-mono font-semibold">{referralCode}</span>
        </p>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
          Work email
        </label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>
      {serverError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {serverError}
        </p>
      )}
      <Button variant="gradient" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        New here?{" "}
        <Link href={registerHref} className="font-semibold text-teal-700">
          Create a learner account
        </Link>
      </p>
      <p className="text-center text-sm text-slate-500">
        Joining as a trainer?{" "}
        <Link href="/register/trainer" className="font-semibold text-teal-700">
          Trainer registration
        </Link>
      </p>
    </form>
  );
}
