import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { purchaseService } from "@/services/purchase.service";
import { bundleItemLabel } from "@/services/bundle.service";
import { installmentPlanService } from "@/services/installment-plan.service";
import { formatDate } from "@/lib/utils";
import { BuyButton } from "@/components/purchases/buy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function planTargetLabel(plan: Awaited<ReturnType<typeof installmentPlanService.listMine>>[number]): string {
  if (plan.learningPath) return plan.learningPath.title;
  if (plan.learningPathModule) return plan.learningPathModule.title;
  return plan.learningPathItem?.feedItem.title ?? "Unknown";
}

function purchaseTitle(purchase: Awaited<ReturnType<typeof purchaseService.listMyPurchases>>[number]): string {
  switch (purchase.purchasableType) {
    case "LEARNING_PATH":
      return purchase.learningPath?.title ?? "Learning path";
    case "LEARNING_PATH_MODULE":
      return purchase.learningPathModule?.title ?? "Module";
    case "LEARNING_PATH_ITEM":
      return purchase.learningPathItem?.feedItem.title ?? "Lesson";
    case "BUNDLE":
      return purchase.bundle?.title ?? "Bundle";
    case "INSTALLMENT":
      return "Installment payment";
    default:
      return "Purchase";
  }
}

export default async function MyPurchasesPage() {
  const user = await requireUser();
  const [purchases, plans] = await Promise.all([
    purchaseService.listMyPurchases(user.id),
    installmentPlanService.listMine(user.id),
  ]);
  const learner = { fullName: user.fullName, email: user.email, phone: user.phone };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-teal-700">Billing</p>
        <h1 className="mt-1 text-3xl font-bold">My Purchases</h1>
      </div>

      {plans.length > 0 && (
        <Card>
          <CardHeader><CardTitle>My Installment Plans</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {plans.map((plan) => {
              const nextDue = plan.installments.find((i) => i.status !== "PAID");
              return (
                <div key={plan.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 dark:border-slate-800">
                  <div>
                    <p className="font-semibold">{planTargetLabel(plan)}</p>
                    <p className="text-sm text-slate-500">
                      ₹{(plan.totalAmountPaise / 100).toLocaleString("en-IN")} total ·{" "}
                      {plan.installments.filter((i) => i.status === "PAID").length}/{plan.installments.length} paid
                    </p>
                    <Badge
                      className={
                        plan.status === "CURRENT"
                          ? "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                          : plan.status === "DEFAULTED"
                            ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                            : ""
                      }
                    >
                      {plan.status}
                    </Badge>
                  </div>
                  {plan.status === "CURRENT" && nextDue && (
                    <BuyButton
                      purchasableType="INSTALLMENT"
                      id={nextDue.id}
                      label={`Pay installment #${nextDue.sequence} — ₹${(nextDue.amountPaise / 100).toLocaleString("en-IN")}`}
                      learner={learner}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {purchases.map((purchase) => (
          <Card key={purchase.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">{purchaseTitle(purchase)}</p>
                {purchase.purchasableType === "BUNDLE" && purchase.bundle && (
                  <p className="mt-1 text-sm text-slate-500">
                    {purchase.bundle.items.map((item) => bundleItemLabel(item)).join(", ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">{formatDate(purchase.createdAt)} · {purchase.razorpayPaymentId}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">₹{(purchase.amountPaise / 100).toLocaleString("en-IN")}</p>
                <Badge className="border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
                  Paid
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {purchases.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            No purchases yet. Browse <Link href="/learning-paths" className="text-teal-700 hover:underline">learning paths</Link> or{" "}
            <Link href="/bundles" className="text-teal-700 hover:underline">bundles</Link>.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
