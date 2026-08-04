import { Suspense } from "react";
import type { Metadata } from "next";
import { HeartPulse } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <AuthLayout
      eyebrow="Medical Coding Global"
      title="Create your learning account."
      footer="Self-registration assigns the Learner role by default"
    >
      <Card className="mx-auto w-full max-w-md rounded-3xl border-0 shadow-2xl">
        <CardHeader className="space-y-2 p-7 pb-4">
          <div className="mb-4 flex items-center gap-2 font-bold text-teal-800 lg:hidden dark:text-teal-300">
            <HeartPulse /> MCG Learn
          </div>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <p className="text-sm text-slate-500">Verify your email after registration to sign in.</p>
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
