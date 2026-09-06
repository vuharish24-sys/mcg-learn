"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";
import { COMPENSATION_TYPE_LABEL } from "@/lib/trainer-program";

type Option = { value: string; label: string };

export function SubmitProposalForm({ courses }: { courses: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetCourseId, setTargetCourseId] = useState("");
  const [compensationType, setCompensationType] = useState("HOURLY");
  const [rateRupees, setRateRupees] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/v1/trainer-proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        targetCourseId: targetCourseId || null,
        proposedCompensationType: compensationType,
        proposedRateAmountPaise: Math.round(Number(rateRupees) * 100),
      }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to submit proposal");
      return;
    }
    setOpen(false);
    setTitle("");
    setDescription("");
    setRateRupees("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Propose a topic/module
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4 dark:border-slate-800">
      <Input placeholder="Proposed module/topic title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Under which existing course? (optional — leave blank to propose a new course)</span>
        <select className={fieldClassName} value={targetCourseId} onChange={(e) => setTargetCourseId(e.target.value)}>
          <option value="">New course</option>
          {courses.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Suggested compensation</span>
          <select className={fieldClassName} value={compensationType} onChange={(e) => setCompensationType(e.target.value)}>
            {Object.entries(COMPENSATION_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Suggested rate (₹)</span>
          <Input type="number" min={1} step="0.01" value={rateRupees} onChange={(e) => setRateRupees(e.target.value)} />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button disabled={submitting || !title.trim() || !description.trim() || !rateRupees} onClick={submit}>
          {submitting ? "Submitting…" : "Submit proposal"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
