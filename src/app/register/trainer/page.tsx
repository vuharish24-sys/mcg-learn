import type { Metadata } from "next";
import { GraduationCap, HeartPulse } from "lucide-react";
import { TrainerRegisterForm } from "@/components/auth/trainer-register-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandingLogoUrl } from "@/lib/branding";

export const metadata: Metadata = { title: "Trainer registration" };

export default async function TrainerRegisterPage() {
  const logoUrl = await getBrandingLogoUrl();
  return (
    <AuthLayout
      eyebrow="Trainer Network"
      title="Join as a Medical Coding trainer."
      tagline="Create your trainer account, complete your profile, and wait for admin activation to appear in the Trainer Network."
      footer={
        <span className="flex items-center gap-2">
          <GraduationCap className="size-4" /> New trainers start as Pending until approved
        </span>
      }
      logoUrl={logoUrl}
    >
      <Card className="mx-auto w-full max-w-md rounded-3xl border-0 shadow-2xl">
        <CardHeader className="space-y-2 p-7 pb-4">
          <div className="mb-4 flex items-center gap-2 font-bold text-teal-800 lg:hidden dark:text-teal-300">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="size-6 rounded object-contain" />
            ) : (
              <HeartPulse />
            )}
            MCG Learn
          </div>
          <CardTitle className="text-2xl">Trainer registration</CardTitle>
          <p className="text-sm text-slate-500">
            Sign up with email and password. Verify your email if prompted, then sign in.
          </p>
        </CardHeader>
        <CardContent className="p-7 pt-3">
          <TrainerRegisterForm />
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
