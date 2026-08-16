import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Briefcase,
  GraduationCap,
  Gift,
  HeartPulse,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFeedContent } from "@/lib/feed-actions";
import { benefitService } from "@/services/benefit.service";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MediaCover } from "@/components/ui/media-cover";
import { trackVisit } from "@/services/funnel.service";
import { getBrandingLogoUrl } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Explore Medical Coding — Free to Start",
  description:
    "Free articles, videos, and quizzes to explore medical coding, plus real course info, live scholarships, and career guidance — from Medical Coding Global.",
};

const benefits = [
  {
    icon: BookOpen,
    title: "Free learning content",
    description: "Bite-sized articles, videos, and quizzes on medical coding — no cost, no experience needed, at your own pace.",
  },
  {
    icon: GraduationCap,
    title: "Real courses & live scholarships",
    description: "See MCG's expert-led Professional and Specialist programs, with current discounts and scholarships shown up front.",
  },
  {
    icon: Briefcase,
    title: "Job board",
    description: "Browse medical coding job openings sourced from MCG's placement partners.",
  },
  {
    icon: Users,
    title: "Career guidance",
    description: "Get matched with a career officer for personalized advice on certifications, specialties, and your job search.",
  },
];

const steps = [
  { title: "Create your free account", description: "Sign up in under a minute — no payment required to get started." },
  { title: "Explore free content", description: "Browse articles, reels, and quizzes to learn the basics and see if medical coding is right for you." },
  { title: "Discover real programs", description: "Check out course tiers, live scholarships, and open jobs when you're ready to go deeper." },
  { title: "Get career guidance", description: "Talk to a career officer about certification paths and your next step." },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role.key === "LEARNER" || user.role.key === "TRAINER" ? "/feed" : "/dashboard");
  }
  const [, logoUrl, courseItems] = await Promise.all([
    trackVisit("landing"),
    getBrandingLogoUrl(),
    prisma.feedItem.findMany({
      where: { type: "COURSE", status: "PUBLISHED" },
      orderBy: { priority: "desc" },
      take: 3,
    }),
  ]);

  const allVariantIds = courseItems.flatMap((item) => parseFeedContent(item.content).course?.variants.map((v) => v.id) ?? []);
  const benefitsByVariant = allVariantIds.length > 0 ? await benefitService.getActiveForVariantIds(allVariantIds) : new Map();
  const courses = courseItems.map((item) => {
    const { course } = parseFeedContent(item.content);
    const firstFee = course?.variants.find((v) => v.fee)?.fee ?? null;
    const hasOffer = course?.variants.some((v) => (benefitsByVariant.get(v.id)?.length ?? 0) > 0) ?? false;
    return { item, fee: firstFee, hasOffer };
  });

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
            Explore medical coding. Free to start.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Learn the fundamentals through free articles, videos, and quizzes — then see
            our expert-led courses, current scholarships, and open coding jobs when
            you&apos;re ready to go further.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className={buttonVariants({ variant: "gradient", size: "lg" })}>
              Explore for free
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

        {courses.length > 0 && (
          <section className="mx-auto max-w-6xl px-6 pb-20">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Real programs, when you&apos;re ready</h2>
              <p className="mx-auto mt-3 max-w-2xl text-slate-500">
                Expert-led courses with live scholarships and current pricing — sign in to see full
                details and enroll.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {courses.map(({ item, fee, hasOffer }) => (
                <Card key={item.id} className="overflow-hidden border-0 shadow-md">
                  <MediaCover src={item.thumbnailUrl} alt={item.title} className="h-32">
                    {hasOffer && (
                      <Badge className="absolute right-2 top-2 gap-1 bg-amber-500 text-white shadow-sm">
                        <Gift className="size-3" /> Scholarship
                      </Badge>
                    )}
                  </MediaCover>
                  <CardContent className="p-5">
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description}</p>
                    {fee && <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-400">From {fee}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/register" className={buttonVariants({ variant: "outline" })}>
                Create a free account to see full course details
              </Link>
            </div>
          </section>
        )}

        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="flex items-center justify-center gap-2 text-teal-700 dark:text-teal-400">
            <BookOpen className="size-5" />
            <GraduationCap className="size-5" />
            <Briefcase className="size-5" />
          </div>
          <h2 className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">
            Ready to see where medical coding could take you?
          </h2>
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            Free to explore. Real programs when you&apos;re ready.
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
