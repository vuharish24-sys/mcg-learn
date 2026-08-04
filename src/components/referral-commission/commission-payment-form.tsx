"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { MediaUploadField } from "@/components/media/media-upload-field";
import { REFERRAL_PAYMENT_METHODS } from "@/lib/referral-commission";
import { enumLabel } from "@/lib/utils";

export function CommissionPaymentForm({
  transactionId,
  defaultAmount,
}: {
  transactionId: string;
  defaultAmount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      transactionId,
      paymentDate: String(form.get("paymentDate") || ""),
      amountPaid: Number(form.get("amountPaid") || defaultAmount),
      paymentMethod: String(form.get("paymentMethod") || ""),
      referenceNumber: String(form.get("referenceNumber") || "") || null,
      remarks: String(form.get("remarks") || "") || null,
    };
    const response = await fetch("/api/v1/referral-commissions/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      setSubmitting(false);
      setError(result.error?.message ?? "Unable to record payment");
      return;
    }

    const proofUrl = String(form.get("proofUrl") || "");
    if (proofUrl && result.data?.id) {
      await fetch(`/api/v1/referral-commissions/payments/${result.data.id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: String(form.get("fileName") || "payment-proof"),
          fileUrl: proofUrl,
          fileType: String(form.get("fileType") || "image/jpeg"),
          fileSize: form.get("fileSize") ? Number(form.get("fileSize")) : null,
        }),
      });
    }

    setSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-xs">
          <span>Date</span>
          <Input
            name="paymentDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="h-8 w-36 text-xs"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span>Amount</span>
          <Input
            name="amountPaid"
            type="number"
            step="0.01"
            min={0}
            defaultValue={defaultAmount}
            className="h-8 w-28 text-xs"
          />
        </label>
        <label className="space-y-1 text-xs">
          <span>Method</span>
          <select name="paymentMethod" className={`${fieldClassName} h-8 w-36 py-0 text-xs`} required>
            {REFERRAL_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>{enumLabel(method)}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span>Reference</span>
          <Input name="referenceNumber" className="h-8 w-32 text-xs" />
        </label>
        <Input name="remarks" placeholder="Remarks" className="h-8 w-40 text-xs" />
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "…" : "Pay"}
        </Button>
      </div>
      <MediaUploadField
        name="proofUrl"
        label="Payment proof (optional)"
        folder="referral-payments"
        purpose="proof"
        accept="image/jpeg,image/png,image/webp,application/pdf"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
