"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { REFERRAL_MILESTONE_TRIGGERS } from "@/lib/referral-commission";
import { enumLabel } from "@/lib/utils";

export function CalculateCommissionForm({
  referrals,
  campaigns,
  courses,
}: {
  referrals: { id: string; label: string }[];
  campaigns: { id: string; name: string }[];
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      referralId: String(form.get("referralId") || ""),
      campaignId: String(form.get("campaignId") || "") || undefined,
      learningPathId: String(form.get("learningPathId") || "") || null,
      trigger: String(form.get("trigger") || ""),
      paymentBasisAmount: Number(form.get("paymentBasisAmount") || 0),
    };
    const response = await fetch("/api/v1/referral-commissions/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to calculate commission");
      return;
    }
    setSuccess(
      `Created ${result.data.created.length} transaction(s)` +
        (result.data.skipped ? ` (${result.data.skipped} already existed)` : ""),
    );
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="space-y-1 text-sm sm:col-span-2 lg:col-span-1">
        <span className="font-medium">Referral</span>
        <select name="referralId" className={fieldClassName} required>
          <option value="">Select referral…</option>
          {referrals.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Campaign (optional)</span>
        <select name="campaignId" className={fieldClassName} defaultValue="">
          <option value="">Auto (highest priority active)</option>
          {campaigns.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Course (optional)</span>
        <select name="learningPathId" className={fieldClassName} defaultValue="">
          <option value="">None</option>
          {courses.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Trigger</span>
        <select name="trigger" className={fieldClassName} required defaultValue="ADMISSION_CONFIRMED">
          {REFERRAL_MILESTONE_TRIGGERS.map((trigger) => (
            <option key={trigger} value={trigger}>{enumLabel(trigger)}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Payment basis amount (₹)</span>
        <Input name="paymentBasisAmount" type="number" min={0} step="0.01" required />
      </label>
      {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}
      {success && <p className="text-sm text-teal-700 sm:col-span-2 lg:col-span-3">{success}</p>}
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Calculating…" : "Generate commission transaction(s)"}
        </Button>
      </div>
    </form>
  );
}
