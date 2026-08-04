import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enumLabel, formatDate } from "@/lib/utils";
import { referralCampaignService, referralCommissionService } from "@/services/referral-commission.service";
import { CalculateCommissionForm } from "@/components/referral-commission/calculate-commission-form";
import { StatusSelect } from "@/components/forms/status-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CommissionApprovalsPage() {
  await requireRole(["ADMIN", "CAREER_OFFICER"]);
  const [pending, campaigns, referrals, courses] = await Promise.all([
    referralCommissionService.listTransactions({ status: "PENDING" }),
    referralCampaignService.list(),
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { referrer: { select: { fullName: true } } },
    }),
    prisma.learningPath.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="space-y-7">
      <div>
        <Link href="/admin/referral-commissions" className="text-sm font-semibold text-teal-700 underline">
          ← Commission engine
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Reward approval</h1>
        <p className="mt-1 text-slate-500">Generate milestone commissions and approve or reject them.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Calculate commission</CardTitle></CardHeader>
        <CardContent>
          <CalculateCommissionForm
            referrals={referrals.map((item) => ({
              id: item.id,
              label: `${item.referredName ?? item.referredEmail ?? item.code} ← ${item.referrer.fullName}`,
            }))}
            campaigns={campaigns.map((item) => ({ id: item.id, name: item.name }))}
            courses={courses}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pending approvals</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Campaign / Milestone</th>
                <th className="px-4 py-3">Calc</th>
                <th className="px-4 py-3">Basis</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {pending.map((txn) => (
                <tr key={txn.id}>
                  <td className="px-4 py-3">
                    {txn.referral.referredName ?? txn.referral.referredEmail ?? "—"}
                  </td>
                  <td className="px-4 py-3">{txn.referral.referrer.fullName}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{txn.campaign.name}</p>
                    <p className="text-xs text-slate-500">{txn.milestone.name} · {enumLabel(txn.trigger)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {enumLabel(txn.calculationType)}{" "}
                    {txn.calculationType === "PERCENTAGE"
                      ? `${Number(txn.value)}%`
                      : `₹${Number(txn.value)}`}
                  </td>
                  <td className="px-4 py-3">
                    {enumLabel(txn.commissionBasis)}
                    <p className="text-xs text-slate-500">₹{Number(txn.paymentBasisAmount).toLocaleString("en-IN")}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    ₹{Number(txn.calculatedAmount).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">{formatDate(txn.transactionDate)}</td>
                  <td className="px-4 py-3">
                    <StatusSelect
                      endpoint={`/api/v1/referral-commissions/${txn.id}`}
                      value={txn.status}
                      options={["PENDING", "APPROVED", "REJECTED", "CANCELLED"]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pending.length === 0 && (
            <p className="p-10 text-center text-slate-500">No pending commissions.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
