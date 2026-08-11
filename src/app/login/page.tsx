import { Suspense } from "react";
import type { Metadata } from "next";
import { HeartPulse } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandingLogoUrl } from "@/lib/branding";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const logoUrl = await getBrandingLogoUrl();
  return (
    <AuthLayout
      eyebrow="Medical Coding Global"
      title="Learn, grow, and build a career that matters."
      footer="Secure learning and career operations platform"
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
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <p className="text-sm text-slate-500">
            Sign in with your learner or trainer MCG account.
          </p>
        </CardHeader>
        <CardContent className="p-7 pt-3">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
