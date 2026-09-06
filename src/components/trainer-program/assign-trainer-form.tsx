"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { COMPENSATION_TYPE_LABEL } from "@/lib/trainer-program";

type Option = { value: string; label: string };

export function AssignTrainerForm({ trainers, modules }: { trainers: Option[]; modules: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [trainerId, setTrainerId] = useState("");
  const [courseModuleId, setCourseModuleId] = useState("");
  const [compensationType, setCompensationType] = useState("HOURLY");
  const [rateRupees, setRateRupees] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/v1/trainer-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainerId,
        courseModuleId,
        compensationType,
        rateAmountPaise: Math.round(Number(rateRupees) * 100),
      }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to assign trainer");
      return;
    }
    setOpen(false);
    setTrainerId("");
    setCourseModuleId("");
    setRateRupees("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Assign trainer to module
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4 dark:border-slate-800">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Trainer</span>
          <select className={fieldClassName} value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
            <option value="">Select trainer</option>
            {trainers.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Module</span>
          <select className={fieldClassName} value={courseModuleId} onChange={(e) => setCourseModuleId(e.target.value)}>
            <option value="">Select module</option>
            {modules.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
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
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button disabled={submitting || !trainerId || !courseModuleId || !rateRupees} onClick={submit}>
          {submitting ? "Saving…" : "Assign"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
