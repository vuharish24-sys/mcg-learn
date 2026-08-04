"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import {
  REFERRAL_MILESTONE_CALC_TYPES,
  REFERRAL_MILESTONE_TRIGGERS,
} from "@/lib/referral-commission";
import { enumLabel } from "@/lib/utils";

export function MilestoneForm({
  campaignId,
  nextSequence,
}: {
  campaignId: string;
  nextSequence: number;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const formEl = formRef.current;
    if (!formEl) {
      setSubmitting(false);
      setError("Form is not ready. Please try again.");
      return;
    }

    const form = new FormData(formEl);
    const payload = {
      name: String(form.get("name") || ""),
      sequence: Number(form.get("sequence") || nextSequence),
      trigger: String(form.get("trigger") || ""),
      calculationType: String(form.get("calculationType") || ""),
      value: Number(form.get("value") || 0),
      isActive: form.get("isActive") === "on",
    };

    try {
      const response = await fetch(`/api/v1/referral-campaigns/${campaignId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error?.message ?? "Unable to add milestone");
        return;
      }
      formEl.reset();
      router.refresh();
    } catch {
      setError("Unable to add milestone");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <label className="space-y-1 text-sm">
        <span className="font-medium">Milestone name</span>
        <Input name="name" required placeholder="Admission Confirmed" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Sequence</span>
        <Input
          key={`seq-${nextSequence}`}
          name="sequence"
          type="number"
          min={1}
          defaultValue={nextSequence}
          required
        />
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
        <span className="font-medium">Calculation</span>
        <select name="calculationType" className={fieldClassName} required defaultValue="FLAT">
          {REFERRAL_MILESTONE_CALC_TYPES.map((type) => (
            <option key={type} value={type}>{enumLabel(type)}</option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Value (₹ or %)</span>
        <Input name="value" type="number" step="0.01" min={0} required />
      </label>
      <label className="flex items-end gap-2 pb-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked />
        Active
      </label>
      {error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{error}</p>}
      <div className="sm:col-span-2 lg:col-span-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add milestone"}
        </Button>
      </div>
    </form>
  );
}
