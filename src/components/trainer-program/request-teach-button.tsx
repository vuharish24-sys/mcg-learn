"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { COMPENSATION_TYPE_LABEL } from "@/lib/trainer-program";

export function RequestTeachButton({ courseModuleId }: { courseModuleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [compensationType, setCompensationType] = useState("HOURLY");
  const [rateRupees, setRateRupees] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/v1/module-teach-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseModuleId,
        proposedCompensationType: compensationType,
        proposedRateAmountPaise: Math.round(Number(rateRupees) * 100),
      }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to send request");
      return;
    }
    setSent(true);
    router.refresh();
  }

  if (sent) return <p className="text-xs text-teal-700">Request sent</p>;

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Request to teach
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border p-2.5 text-xs dark:border-slate-800">
      <select className={`${fieldClassName} h-8 text-xs`} value={compensationType} onChange={(e) => setCompensationType(e.target.value)}>
        {Object.entries(COMPENSATION_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <Input type="number" min={1} step="0.01" placeholder="Suggested rate (₹)" value={rateRupees} onChange={(e) => setRateRupees(e.target.value)} className="h-8 text-xs" />
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={submitting || !rateRupees} onClick={submit}>Send request</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
