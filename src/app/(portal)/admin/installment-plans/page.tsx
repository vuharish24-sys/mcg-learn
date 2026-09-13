import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { installmentPlanService } from "@/services/installment-plan.service";
import type { BundleItemOption } from "@/components/forms/bundle-form";
import { InstallmentPlanForm } from "@/components/forms/installment-plan-form";
import { DefaultPlanButton } from "@/components/forms/default-plan-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

function statusBadgeClass(status: string): string {
  if (status === "CURRENT") return "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300";
  if (status === "COMPLETED") return "";
  if (status === "DEFAULTED") return "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
  return "bg-slate-100 text-slate-500";
}

export default async function AdminInstallmentPlansPage() {
  await requireRole(["ADMIN"]);
  const [plans, paidPaths, paidModules, paidItems] = await Promise.all([
    installmentPlanService.list(),
    prisma.learningPath.findMany({
      where: { priceInPaise: { not: null } },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.learningPathModule.findMany({
      where: { priceInPaise: { not: null } },
      select: { id: true, title: true, learningPath: { select: { title: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.learningPathItem.findMany({
      where: { priceInPaise: { not: null } },
      select: { id: true, feedItem: { select: { title: true } }, learningPath: { select: { title: true } } },
      orderBy: { feedItem: { title: "asc" } },
    }),
  ]);

  const targetOptions: BundleItemOption[] = [
    ...paidPaths.map((p) => ({ type: "LEARNING_PATH" as const, id: p.id, label: `Course: ${p.title}` })),
    ...paidModules.map((m) => ({
      type: "LEARNING_PATH_MODULE" as const,
      id: m.id,
      label: `Module: ${m.title} (${m.learningPath.title})`,
    })),
    ...paidItems.map((i) => ({
      type: "LEARNING_PATH_ITEM" as const,
      id: i.id,
      label: `Lesson: ${i.feedItem.title} (${i.learningPath.title})`,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
          <h1 className="mt-2 text-3xl font-bold">Installment Plans</h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Let a learner pay for one course, module, or lesson in parts. Full access to that unit stays open while
            the plan is CURRENT and is revoked immediately on default.
          </p>
        </div>
        <InstallmentPlanForm targetOptions={targetOptions} />
      </div>

      <div className="grid gap-4">
        {plans.map((plan) => {
          const target = plan.learningPath
            ? { kind: "Course", label: plan.learningPath.title }
            : plan.learningPathModule
              ? { kind: "Module", label: plan.learningPathModule.title }
              : { kind: "Lesson", label: plan.learningPathItem?.feedItem.title ?? "Unknown" };
          return (
            <Card key={plan.id}>
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>
                    {target.kind}: {target.label}
                  </CardTitle>
                  <p className="mt-1 text-sm text-slate-500">
                    {plan.user.fullName} ({plan.user.email}) · ₹{(plan.totalAmountPaise / 100).toLocaleString("en-IN")} total
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={statusBadgeClass(plan.status)}>{plan.status}</Badge>
                  {plan.status === "CURRENT" && <DefaultPlanButton planId={plan.id} />}
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {plan.installments.map((installment) => (
                  <Badge
                    key={installment.id}
                    className={
                      installment.status === "PAID"
                        ? "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                        : "border border-slate-200 bg-transparent text-slate-600 dark:border-slate-700"
                    }
                  >
                    #{installment.sequence} ₹{(installment.amountPaise / 100).toLocaleString("en-IN")} · due{" "}
                    {formatDate(installment.dueDate)} · {installment.status}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {plans.length === 0 && (
        <Card><CardContent className="p-12 text-center text-slate-500">No installment plans yet.</CardContent></Card>
      )}
    </div>
  );
}
