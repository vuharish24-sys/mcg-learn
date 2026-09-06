import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { purchaseService } from "@/services/purchase.service";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function MyPurchasesPage() {
  const user = await requireUser();
  const purchases = await purchaseService.listMyPurchases(user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-teal-700">Billing</p>
        <h1 className="mt-1 text-3xl font-bold">My Purchases</h1>
      </div>

      <div className="grid gap-4">
        {purchases.map((purchase) => (
          <Card key={purchase.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-semibold">
                  {purchase.purchasableType === "LEARNING_PATH" ? purchase.learningPath?.title : purchase.bundle?.title}
                </p>
                {purchase.purchasableType === "BUNDLE" && purchase.bundle && (
                  <p className="mt-1 text-sm text-slate-500">
                    {purchase.bundle.paths.map((bp) => bp.learningPath.title).join(", ")}
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
