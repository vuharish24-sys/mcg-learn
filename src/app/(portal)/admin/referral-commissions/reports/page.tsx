import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { enumLabel, formatDate } from "@/lib/utils";
import { referralCommissionService } from "@/services/referral-commission.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default async function CommissionReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["ADMIN", "CAREER_OFFICER"]);
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;
  const reports = await referralCommissionService.reports({ from, to });
  const audit = await referralCommissionService.listAudit(40);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin/referral-commissions" className="text-sm font-semibold text-teal-700 underline">
            ← Commission engine
          </Link>
          <h1 className="mt-2 text-3xl font-bold">Commission reports</h1>
          <p className="mt-1 text-slate-500">Date-wise, campaign, referrer, course, and officer views.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2 text-sm">
          <label className="space-y-1">
            <span className="text-xs text-slate-500">From</span>
            <input type="date" name="from" defaultValue={params.from} className="h-9 rounded-lg border px-2" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-500">To</span>
            <input type="date" name="to" defaultValue={params.to} className="h-9 rounded-lg border px-2" />
          </label>
          <button type="submit" className="h-9 rounded-lg bg-teal-700 px-3 font-semibold text-white">
            Apply
          </button>
        </form>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total</p><p className="mt-2 text-2xl font-bold">{money(reports.summary.totalEarned)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Pending</p><p className="mt-2 text-2xl font-bold">{money(reports.summary.pending.amount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Paid</p><p className="mt-2 text-2xl font-bold">{money(reports.summary.paid.amount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Rejected</p><p className="mt-2 text-2xl font-bold">{money(reports.summary.rejected.amount)}</p></CardContent></Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>By month</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reports.charts.byMonth.map((row) => (
              <div key={row.month} className="flex justify-between text-sm">
                <span>{row.month}</span><span className="font-semibold">{money(row.amount)}</span>
              </div>
            ))}
            {reports.charts.byMonth.length === 0 && <p className="text-sm text-slate-500">No data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By campaign</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reports.charts.byCampaign.map((row) => (
              <div key={row.name} className="flex justify-between gap-3 text-sm">
                <span className="truncate">{row.name}</span><span className="font-semibold">{money(row.amount)}</span>
              </div>
            ))}
            {reports.charts.byCampaign.length === 0 && <p className="text-sm text-slate-500">No data</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By course</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reports.charts.byCourse.map((row) => (
              <div key={row.name} className="flex justify-between gap-3 text-sm">
                <span className="truncate">{row.name}</span><span className="font-semibold">{money(row.amount)}</span>
              </div>
            ))}
            {reports.charts.byCourse.length === 0 && <p className="text-sm text-slate-500">No data</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Referrer-wise</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reports.charts.byReferrer.map((row) => (
              <div key={row.name} className="flex justify-between text-sm">
                <span>{row.name}</span><span className="font-semibold">{money(row.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Officer-wise (paid)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reports.charts.byOfficer.map((row) => (
              <div key={row.name} className="flex justify-between text-sm">
                <span>{row.name}</span><span className="font-semibold">{money(row.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Date-wise commission ledger</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Milestone</th>
                <th className="px-4 py-3">Calc</th>
                <th className="px-4 py-3">Basis</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid on</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {reports.transactions.map((txn) => (
                <tr key={txn.id}>
                  <td className="px-4 py-3">{formatDate(txn.transactionDate)}</td>
                  <td className="px-4 py-3">{txn.referral.referredName ?? txn.referral.referredEmail ?? "—"}</td>
                  <td className="px-4 py-3">{txn.campaign.name}</td>
                  <td className="px-4 py-3">{txn.milestone.name}</td>
                  <td className="px-4 py-3">
                    {enumLabel(txn.calculationType)}{" "}
                    {txn.calculationType === "PERCENTAGE" ? `${Number(txn.value)}%` : `₹${Number(txn.value)}`}
                  </td>
                  <td className="px-4 py-3">{enumLabel(txn.commissionBasis)}</td>
                  <td className="px-4 py-3 font-semibold">{money(Number(txn.calculatedAmount))}</td>
                  <td className="px-4 py-3"><Badge>{enumLabel(txn.status)}</Badge></td>
                  <td className="px-4 py-3">{txn.payment ? formatDate(txn.payment.paymentDate) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Audit trail</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {audit.map((event) => (
            <div key={event.id} className="flex flex-wrap items-start justify-between gap-2 border-b py-2 text-sm last:border-0 dark:border-slate-800">
              <div>
                <p className="font-medium">{event.action}</p>
                <p className="text-xs text-slate-500">
                  {event.actor?.fullName ?? "System"} · {formatDate(event.createdAt)}
                </p>
              </div>
              <p className="max-w-md break-all text-xs text-slate-500">
                {event.details ? JSON.stringify(event.details) : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
