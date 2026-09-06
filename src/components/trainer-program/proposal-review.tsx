"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { COMPENSATION_TYPE_LABEL } from "@/lib/trainer-program";

type Option = { value: string; label: string };

export function ProposalReview({
  proposalId,
  courses,
  suggestedCompensationType,
  suggestedRateRupees,
}: {
  proposalId: string;
  courses: Option[];
  suggestedCompensationType: string;
  suggestedRateRupees: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approving">("idle");
  const [targetCourseId, setTargetCourseId] = useState("");
  const [compensationType, setCompensationType] = useState(suggestedCompensationType);
  const [rateRupees, setRateRupees] = useState(String(suggestedRateRupees));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/v1/trainer-proposals/${proposalId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save decision");
      return;
    }
    router.refresh();
  }

  if (mode === "approving") {
    return (
      <div className="space-y-2 rounded-lg border p-3 dark:border-slate-800">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Course to place this module under</span>
          <select className={fieldClassName} value={targetCourseId} onChange={(e) => setTargetCourseId(e.target.value)}>
            <option value="">Select course</option>
            {courses.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Compensation type</span>
          <select className={fieldClassName} value={compensationType} onChange={(e) => setCompensationType(e.target.value)}>
            {Object.entries(COMPENSATION_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Rate (₹)</span>
          <Input type="number" min={1} step="0.01" value={rateRupees} onChange={(e) => setRateRupees(e.target.value)} />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy || !targetCourseId || !rateRupees}
            onClick={() =>
              decide({
                status: "APPROVED",
                targetCourseId,
                finalCompensationType: compensationType,
                finalRateAmountPaise: Math.round(Number(rateRupees) * 100),
              })
            }
          >
            Confirm approval
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode("idle")}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => setMode("approving")}>Approve</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide({ status: "NEEDS_REVISION" })}>
          Needs revision
        </Button>
        <Button size="sm" variant="outline" className="text-red-700" disabled={busy} onClick={() => decide({ status: "REJECTED" })}>
          Reject
        </Button>
      </div>
    </div>
  );
}
