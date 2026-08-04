import Link from "next/link";
import {
  Award,
  CalendarClock,
  GraduationCap,
  Megaphone,
  Network,
  Route,
  Trophy,
  UserPlus,
  Users,
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

const STAT_BADGE_COLORS = [
  "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
];

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
      <div>
        <p className="text-sm font-medium text-teal-700">{user.role.name} dashboard</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome,{" "}
          <span className="bg-gradient-to-r from-teal-600 to-violet-600 bg-clip-text text-transparent">
            {user.fullName.split(" ")[0]}
          </span>
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">{subtitle}</p>
      </div>

      {!advisingReady && (
        <Card className="border-teal-200 bg-teal-50/60 dark:border-teal-900 dark:bg-teal-950/40">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-teal-900 dark:text-teal-200">
                Complete your advising profile
              </p>
              <p className="mt-1 text-sm text-teal-800/80 dark:text-teal-300/80">
                Add qualification, date of birth, and goals so we can recommend the right courses.
              </p>
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
            <CardContent className="p-4">
              <p className="text-xs text-teal-100">Commission earned</p>
              <p className="mt-1 text-xl font-bold">
                ₹{commissionSummary.totalEarned.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="mt-1 text-xl font-bold">
                ₹{commissionSummary.pending.amount.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Approved</p>
              <p className="mt-1 text-xl font-bold">
                ₹{commissionSummary.approved.amount.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">Paid</p>
              <p className="mt-1 text-xl font-bold">
                ₹{commissionSummary.paid.amount.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, href }, index) => {
          const content = (
            <CardContent className="flex items-center gap-4 p-5">
              <span className={`rounded-xl p-3 ${STAT_BADGE_COLORS[index % STAT_BADGE_COLORS.length]}`}>
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
              <Card className="transition duration-300 hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg">{content}</Card>
            </Link>
          ) : (
            <Card key={label}>{content}</Card>
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
