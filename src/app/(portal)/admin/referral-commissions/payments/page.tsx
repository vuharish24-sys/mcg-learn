import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { enumLabel, formatDate } from "@/lib/utils";
import { referralCommissionService } from "@/services/referral-commission.service";
import { CommissionPaymentForm } from "@/components/referral-commission/commission-payment-form";
import { PaymentProofActions } from "@/components/referral-commission/payment-proof-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CommissionPaymentsPage() {
  await requireRole(["ADMIN"]);
  const [approved, paid] = await Promise.all([
    referralCommissionService.listTransactions({ status: "APPROVED" }),
    referralCommissionService.reports(),
  ]);

  return (
    <div className="space-y-7">
      <div>
        <Link href="/admin/referral-commissions" className="text-sm font-semibold text-teal-700 underline">
          ← Commission engine
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Payment processing</h1>
        <p className="mt-1 text-slate-500">Record UPI, bank transfer, or cash payouts with date-wise history.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Approved — ready to pay</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {approved.map((txn) => (
            <div key={txn.id} className="rounded-lg border p-4 dark:border-slate-800">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {txn.referral.referrer.fullName} ← {txn.referral.referredName ?? txn.referral.referredEmail}
                  </p>
                  <p className="text-sm text-slate-500">
                    {txn.campaign.name} · {txn.milestone.name} · ₹{Number(txn.calculatedAmount).toLocaleString("en-IN")}
                  </p>
                </div>
                <Badge>{enumLabel(txn.status)}</Badge>
              </div>
              <CommissionPaymentForm
                transactionId={txn.id}
                defaultAmount={Number(txn.calculatedAmount)}
              />
            </div>
          ))}
          {approved.length === 0 && (
            <p className="py-8 text-center text-slate-500">No approved commissions waiting for payment.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment history</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Payment date</th>
                <th className="px-4 py-3">Referrer</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Proof</th>
                <th className="px-4 py-3">Paid by</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {paid.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">{formatDate(payment.paymentDate)}</td>
                  <td className="px-4 py-3">{payment.transaction.referral.referrer.fullName}</td>
                  <td className="px-4 py-3">{payment.transaction.campaign.name}</td>
                  <td className="px-4 py-3 font-semibold">
                    ₹{Number(payment.amountPaid).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3">{enumLabel(payment.paymentMethod)}</td>
                  <td className="px-4 py-3">{payment.referenceNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <PaymentProofActions
                      paymentId={payment.id}
                      attachments={payment.attachments ?? []}
                    />
                  </td>
                  <td className="px-4 py-3">{payment.paidBy.fullName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {paid.payments.length === 0 && (
            <p className="p-10 text-center text-slate-500">No payments recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
