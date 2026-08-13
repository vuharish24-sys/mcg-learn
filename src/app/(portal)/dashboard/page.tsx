import Link from "next/link";
import {
  Award,
  CalendarClock,
  GraduationCap,
  Megaphone,
  Network,
  Route,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  Clock3,
  CheckCircle2,
  BadgeIndianRupee,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/services/dashboard.service";
import { feedService } from "@/services/feed.service";
import { getProfileCompleteness } from "@/services/profile.service";
import { referralCommissionService } from "@/services/referral-commission.service";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardLearningTabs } from "@/components/dashboard/dashboard-learning-tabs";
import { buttonVariants } from "@/components/ui/button";
import { enumLabel } from "@/lib/utils";

type Stat = {
  label: string;
  value: number | string;
  icon: typeof UserPlus;
  href?: string;
};

const STAT_STYLES = [
  {
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
    card: "border-teal-100 bg-teal-50/50 dark:border-teal-950 dark:bg-teal-950/10",
  },
  {
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    card: "border-violet-100 bg-violet-50/50 dark:border-violet-950 dark:bg-violet-950/10",
  },
  {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    card: "border-amber-100 bg-amber-50/50 dark:border-amber-950 dark:bg-amber-950/10",
  },
  {
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    card: "border-rose-100 bg-rose-50/50 dark:border-rose-950 dark:bg-rose-950/10",
  },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  await feedService.ensureMissingPreviews(10);
  const data = await getDashboardData(user.id, user.role.key);
  const activeTrainers = data.trainerSummary.find((item) => item.status === "ACTIVE")?._count ?? 0;
  const referrals = data.referralSummary.reduce((total, item) => total + item._count, 0);
  const qualifiedReferrals =
    data.referralSummary.find((item) => item.status === "QUALIFIED")?._count ?? 0;

  let stats: Stat[] = [];
  let subtitle = "Here is what needs attention today.";

  if (user.role.key === "ADMIN") {
    subtitle = "Platform operations overview for administrators.";
    const lp = data.adminLearningStats;
    stats = [
      { label: "Today's leads", value: data.todaysLeads, icon: UserPlus, href: "/crm" },
      { label: "Today's follow-ups", value: data.todaysFollowUps, icon: CalendarClock, href: "/crm" },
      { label: "Open leads", value: data.openLeads, icon: Users, href: "/crm" },
      { label: "Learning paths", value: lp?.publishedPaths ?? 0, icon: Route, href: "/admin/learning-paths" },
      { label: "Path certificates", value: lp?.certificatesIssued ?? 0, icon: Award, href: "/certificates" },
      { label: "Completion rate", value: `${lp?.completionRate ?? 0}%`, icon: Trophy, href: "/admin/learning-paths" },
      { label: "Quiz pass rate", value: `${lp?.quizPassRate ?? 0}%`, icon: GraduationCap, href: "/admin/learning-paths" },
      { label: "Popular path", value: lp?.mostPopularPath?.title ?? "—", icon: Route, href: lp?.mostPopularPath ? `/learning-paths/${lp.mostPopularPath.slug}` : "/admin/learning-paths" },
      { label: "Active trainers", value: activeTrainers, icon: GraduationCap, href: "/trainers" },
      { label: "Referrals", value: referrals, icon: Network, href: "/referrals" },
      { label: "Certificates issued", value: data.certificates, icon: Award, href: "/certificates" },
      { label: "Active ads", value: data.activeAds, icon: Megaphone, href: "/advertisements" },
    ];
  } else if (user.role.key === "CAREER_OFFICER") {
    subtitle = "Your assigned pipeline and follow-ups.";
    stats = [
      { label: "Today's leads", value: data.todaysLeads, icon: UserPlus, href: "/crm" },
      { label: "Today's follow-ups", value: data.todaysFollowUps, icon: CalendarClock, href: "/crm" },
      { label: "Open assigned leads", value: data.openLeads, icon: Users, href: "/crm" },
      { label: "Active trainers", value: activeTrainers, icon: GraduationCap, href: "/trainers" },
      { label: "Your referrals", value: referrals, icon: Network, href: "/referrals" },
      { label: "Qualified referrals", value: qualifiedReferrals, icon: Network, href: "/referrals" },
    ];
  } else if (user.role.key === "TRAINER") {
    subtitle = "Trainer network and learning activity.";
    stats = [
      { label: "Your status", value: data.myTrainerProfile ? enumLabel(data.myTrainerProfile.status) : "Not linked", icon: GraduationCap, href: "/trainers" },
      { label: "Active trainers", value: activeTrainers, icon: GraduationCap, href: "/trainers" },
      { label: "Your referrals", value: referrals, icon: Network, href: "/referrals" },
      { label: "Certificates", value: data.certificates, icon: Award, href: "/certificates" },
    ];
  } else {
    subtitle = "Your learning progress and referrals.";
    const lp = data.learnerLearningStats;
    stats = [
      { label: "Continue learning", value: lp?.pathsInProgress ?? 0, icon: Route, href: "/my-learning" },
      { label: "Learning paths done", value: lp?.pathsCompleted ?? 0, icon: Trophy, href: "/my-learning" },
      { label: "Avg quiz score", value: `${lp?.avgQuizScore ?? 0}%`, icon: GraduationCap, href: "/my-learning" },
      { label: "Your certificates", value: data.certificates, icon: Award, href: "/my-achievements" },
      { label: "Your referrals", value: referrals, icon: Network, href: "/referrals" },
      { label: "Recent feed items", value: data.recentFeed.length, icon: Users, href: "/feed" },
    ];
  }

  const continueLearning =
    user.role.key === "LEARNER"
      ? (data.learnerLearningStats?.continueLearning ?? []).map((row) => ({
          learningPath: row.learningPath,
          progressPercent: row.progressPercent,
          continueHref: row.continueHref,
        }))
      : [];

  const advisingReady = getProfileCompleteness(user).isReadyForAdvising;
  const isAdminLike = ["ADMIN", "CAREER_OFFICER"].includes(user.role.key);
  const commissionSummary = await referralCommissionService.summary(
    isAdminLike ? undefined : user.id,
  );

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-violet-50 p-6 dark:border-teal-950 dark:from-teal-950/30 dark:via-slate-900 dark:to-violet-950/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-gradient-to-br from-teal-400/25 to-violet-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 size-56 rounded-full bg-gradient-to-tr from-violet-400/15 to-teal-400/15 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-teal-800 shadow-sm ring-1 ring-teal-900/5 backdrop-blur-sm dark:bg-white/10 dark:text-teal-300 dark:ring-white/10">
            <Sparkles className="size-3.5" /> {user.role.name} dashboard
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {greeting()},{" "}
            <span className="bg-gradient-to-r from-teal-600 to-violet-600 bg-clip-text text-transparent">
              {user.fullName.split(" ")[0]}
            </span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">{subtitle}</p>
        </div>
      </div>

      {!advisingReady && (
        <Card className="border-teal-200 bg-teal-50/60 dark:border-teal-900 dark:bg-teal-950/40">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-teal-100 p-2.5 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-teal-900 dark:text-teal-200">
                  Complete your advising profile
                </p>
                <p className="mt-1 text-sm text-teal-800/80 dark:text-teal-300/80">
                  Add qualification, date of birth, and goals so we can recommend the right courses.
                </p>
              </div>
            </div>
            <Link href="/profile" className={buttonVariants({ size: "sm" })}>
              Update profile
            </Link>
          </CardContent>
        </Card>
      )}

      {(commissionSummary.totalEarned > 0 || isAdminLike) && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-0 bg-gradient-to-br from-teal-600 to-violet-600 text-white shadow-lg shadow-teal-600/20">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-xl bg-white/15 p-2.5">
                <Wallet className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-teal-100">Commission earned</p>
                <p className="mt-0.5 truncate text-xl font-bold">
                  ₹{commissionSummary.totalEarned.toLocaleString("en-IN")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-100 bg-amber-50/50 dark:border-amber-950 dark:bg-amber-950/10">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-xl bg-amber-100 p-2.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <Clock3 className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Pending</p>
                <p className="mt-0.5 truncate text-xl font-bold">
                  ₹{commissionSummary.pending.amount.toLocaleString("en-IN")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-teal-100 bg-teal-50/50 dark:border-teal-950 dark:bg-teal-950/10">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-xl bg-teal-100 p-2.5 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <CheckCircle2 className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Approved</p>
                <p className="mt-0.5 truncate text-xl font-bold">
                  ₹{commissionSummary.approved.amount.toLocaleString("en-IN")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-violet-100 bg-violet-50/50 dark:border-violet-950 dark:bg-violet-950/10">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <BadgeIndianRupee className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Paid</p>
                <p className="mt-0.5 truncate text-xl font-bold">
                  ₹{commissionSummary.paid.amount.toLocaleString("en-IN")}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, href }, index) => {
          const style = STAT_STYLES[index % STAT_STYLES.length];
          const content = (
            <CardContent className="flex items-center gap-4 p-5">
              <span className={`rounded-xl p-3 ${style.badge}`}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-2xl font-bold">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </CardContent>
          );
          return href ? (
            <Link key={label} href={href}>
              <Card className={`${style.card} transition duration-300 hover:-translate-y-0.5 hover:shadow-lg`}>{content}</Card>
            </Link>
          ) : (
            <Card key={label} className={style.card}>{content}</Card>
          );
        })}
      </section>

      <DashboardLearningTabs
        courses={data.courses}
        continueLearning={continueLearning}
        feedItems={data.recentFeed}
        coursesHref={user.role.key === "LEARNER" ? "/my-learning" : "/learning-paths"}
        feedHref="/feed"
      />
    </div>
  );
}
