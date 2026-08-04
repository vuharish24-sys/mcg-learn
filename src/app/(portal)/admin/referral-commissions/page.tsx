import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enumLabel, formatDate } from "@/lib/utils";
import { referralCampaignService, referralCommissionService } from "@/services/referral-commission.service";
import { campaignManagementService } from "@/services/campaign-management.service";
import { CampaignForm } from "@/components/referral-commission/campaign-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default async function ReferralCommissionsAdminPage() {
  await requireRole(["ADMIN"]);
  const [campaigns, summary, courses, expiringSoon] = await Promise.all([
    referralCampaignService.list(),
    referralCommissionService.summary(),
    prisma.learningPath.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    campaignManagementService.expiringSoon(7),
  ]);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">Referral Commission Engine</p>
          <h1 className="mt-1 text-3xl font-bold">Campaigns & payouts</h1>
          <p className="mt-2 text-slate-500">
            Configure flat, percentage, hybrid, installment, and milestone commission rules.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-teal-700">
          <Link href="/admin/referral-commissions/approvals" className="underline">Approvals</Link>
          <Link href="/admin/referral-commissions/payments" className="underline">Payments</Link>
          <Link href="/admin/referral-commissions/reports" className="underline">Reports</Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total earned</p><p className="mt-2 text-2xl font-bold">{money(summary.totalEarned)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Pending</p><p className="mt-2 text-2xl font-bold">{money(summary.pending.amount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Approved</p><p className="mt-2 text-2xl font-bold">{money(summary.approved.amount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Paid</p><p className="mt-2 text-2xl font-bold">{money(summary.paid.amount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Rejected</p><p className="mt-2 text-2xl font-bold">{money(summary.rejected.amount)}</p></CardContent></Card>
      </section>

      {expiringSoon.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Milestones expiring within 7 days</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
                <tr>
                  <th className="px-5 py-3">Milestone</th>
                  <th className="px-5 py-3">Campaign</th>
                  <th className="px-5 py-3">Referrer</th>
                  <th className="px-5 py-3">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {expiringSoon.map((milestone) => (
                  <tr key={milestone.id}>
                    <td className="px-5 py-3 font-medium">{milestone.sequence}. {milestone.name}</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/referral-commissions/campaigns/${milestone.campaign.id}`} className="text-teal-700 underline">
                        {milestone.campaign.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{milestone.referral.referrer.fullName}</td>
                    <td className="px-5 py-3"><Badge>{formatDate(milestone.expiryDate)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Create campaign</CardTitle></CardHeader>
        <CardContent>
          <CampaignForm courses={courses} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Basis</th>
                <th className="px-5 py-3">Window</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Milestones</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-5 py-3">
                    <Link href={`/admin/referral-commissions/campaigns/${campaign.id}`} className="font-semibold text-teal-700 underline">
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-slate-500">Terms {campaign.termsVersion}</p>
                  </td>
                  <td className="px-5 py-3">{enumLabel(campaign.commissionType)}</td>
                  <td className="px-5 py-3">{enumLabel(campaign.commissionBasis)}</td>
                  <td className="px-5 py-3">{formatDate(campaign.startsAt)} → {formatDate(campaign.endsAt)}</td>
                  <td className="px-5 py-3">{campaign.priority}</td>
                  <td className="px-5 py-3">{campaign.milestones.length}</td>
                  <td className="px-5 py-3"><Badge>{enumLabel(campaign.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {campaigns.length === 0 && (
            <p className="p-10 text-center text-slate-500">No campaigns yet. Create one above.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
