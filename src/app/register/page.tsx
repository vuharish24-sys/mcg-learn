import { Suspense } from "react";
import type { Metadata } from "next";
import { HeartPulse, CheckCircle2 } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandingLogoUrl } from "@/lib/branding";

export const metadata: Metadata = { title: "Create your free account" };

const benefits = [
  "Structured, self-paced learning paths",
  "A verified certificate when you complete one",
  "One-on-one career guidance along the way",
];

export default async function RegisterPage() {
  const logoUrl = await getBrandingLogoUrl();
  return (
    <AuthLayout
      eyebrow="Medical Coding Global"
      title="Start your medical coding career today."
      tagline="Free to join — no experience or payment required to get started."
      footer="Trusted by learners building real careers in medical coding"
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
          <CardTitle className="text-2xl">Create your free account</CardTitle>
          <ul className="space-y-1.5 pt-1">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400" />
                {benefit}
              </li>
            ))}
          </ul>
          <p className="pt-1 text-sm text-slate-500">You&rsquo;ll need to verify your email before signing in.</p>
        </CardHeader>
        <CardContent className="p-7 pt-3">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
            <RegisterForm />
          </Suspense>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
