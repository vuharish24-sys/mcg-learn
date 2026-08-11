import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  Network,
  Route,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackVisit } from "@/services/funnel.service";
import { getBrandingLogoUrl } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Build a Medical Coding Career",
  description:
    "Structured learning paths, verified certificates, and one-on-one career guidance to help you become a certified medical coder — from Medical Coding Global.",
};

const benefits = [
  {
    icon: Route,
    title: "Structured learning paths",
    description: "Step-by-step curricula that take you from the basics to job-ready, with required quizzes to confirm you've actually learned it.",
  },
  {
    icon: Award,
    title: "Verified certificates",
    description: "Earn a certificate with a public, shareable verification link the moment you complete a path — proof employers can check.",
  },
  {
    icon: Users,
    title: "One-on-one career guidance",
    description: "Get matched with a career officer for personalized advice on certifications, specialties, and your job search.",
  },
  {
    icon: Network,
    title: "Earn by referring others",
    description: "Join the referral program and earn rewards for introducing other future coders to Medical Coding Global.",
  },
];

const steps = [
  { title: "Create your free account", description: "Sign up in under a minute — no payment required to get started." },
  { title: "Work through a learning path", description: "Read, watch, and practice at your own pace, on any device." },
  { title: "Pass the quiz, earn your certificate", description: "Prove what you've learned and get a verifiable credential instantly." },
  { title: "Get career guidance", description: "Talk to a career officer about certification, specialties, and job placement." },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const [, logoUrl] = await Promise.all([trackVisit("landing"), getBrandingLogoUrl()]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5 text-lg font-bold text-teal-800 dark:text-teal-300">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-9 rounded-lg object-contain" />
          ) : (
            <span className="rounded-lg bg-gradient-to-br from-teal-600 to-violet-600 p-2 text-white">
              <HeartPulse className="size-5" />
            </span>
          )}
          MCG Learn
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>Sign in</Link>
          <Link href="/register" className={buttonVariants({ variant: "gradient" })}>Get started</Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 pb-20 pt-12 text-center sm:pt-20">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
            Medical Coding Global
          </p>
          <h1 className="text-4xl font-bold leading-tight text-slate-900 sm:text-6xl dark:text-white">
            Build a career that matters, one learning path at a time.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Learn medical coding through structured, self-paced learning paths, earn a
            verified certificate, and get one-on-one career guidance to launch your future
            — no experience needed.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className={buttonVariants({ variant: "gradient", size: "lg" })}>
              Start learning for free
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              I already have an account
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-0 shadow-md">
                <CardContent className="p-6">
                  <span className="inline-flex rounded-xl bg-gradient-to-br from-teal-600 to-violet-600 p-2.5 text-white">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-bold">{title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 py-20 dark:bg-slate-900/40">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-3xl font-bold text-slate-900 dark:text-white">How it works</h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-violet-600 text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold">{step.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="flex items-center justify-center gap-2 text-teal-700 dark:text-teal-400">
            <BookOpen className="size-5" />
            <GraduationCap className="size-5" />
            <CheckCircle2 className="size-5" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
            Your medical coding career starts today.
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Free to join. No experience required.
          </p>
          <Link href="/register" className={`${buttonVariants({ variant: "gradient", size: "lg" })} mt-8`}>
            Create your free account
          </Link>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-6 py-8 text-sm text-slate-500 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Medical Coding Global. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/legal/privacy" className="hover:text-teal-700 dark:hover:text-teal-400">Privacy Policy</Link>
            <Link href="/legal/referral-terms" className="hover:text-teal-700 dark:hover:text-teal-400">Referral Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
