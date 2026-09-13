"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import type { BundleItemOption, BundleItemType } from "@/components/forms/bundle-form";

type InstallmentRow = { amountRupees: string; dueDate: string };

export function InstallmentPlanForm({ targetOptions }: { targetOptions: BundleItemOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [targetKey, setTargetKey] = useState(targetOptions[0] ? `${targetOptions[0].type}:${targetOptions[0].id}` : "");
  const [installments, setInstallments] = useState<InstallmentRow[]>([
    { amountRupees: "", dueDate: "" },
    { amountRupees: "", dueDate: "" },
  ]);

  function addRow() {
    setInstallments((current) => [...current, { amountRupees: "", dueDate: "" }]);
  }
  function removeRow(index: number) {
    setInstallments((current) => current.filter((_, i) => i !== index));
  }

  async function submit(formData: FormData) {
    if (installments.length < 2 || installments.some((row) => !row.amountRupees || !row.dueDate)) {
      setError("Add at least 2 installments, each with an amount and due date");
      return;
    }
    const [targetType, targetId] = targetKey.split(":") as [BundleItemType, string];
    setSubmitting(true);
    setError("");
    const payload = {
      userEmail: formData.get("userEmail"),
      targetType,
      targetId,
      installments: installments.map((row) => ({
        amountPaise: Math.round(Number(row.amountRupees) * 100),
        dueDate: row.dueDate,
      })),
    };

    const response = await fetch("/api/v1/installment-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to create installment plan");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New installment plan
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">New installment plan</h2>
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
        </div>
        <form action={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Learner&apos;s email</span>
            <Input name="userEmail" type="email" required placeholder="learner@example.com" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Course, module, or lesson</span>
            <select value={targetKey} onChange={(e) => setTargetKey(e.target.value)} className={fieldClassName}>
              {targetOptions.map((option) => (
                <option key={`${option.type}:${option.id}`} value={`${option.type}:${option.id}`}>
                  {option.label}
                </option>
              ))}
            </select>
            {targetOptions.length === 0 && <span className="text-xs text-slate-500">No priced courses, modules, or lessons yet.</span>}
          </label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Installments</span>
              <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-4" /> Add installment</Button>
            </div>
            {installments.map((row, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  placeholder="Amount ₹"
                  type="number"
                  min={1}
                  step="0.01"
                  value={row.amountRupees}
                  onChange={(e) => setInstallments((c) => c.map((r, i) => (i === index ? { ...r, amountRupees: e.target.value } : r)))}
                />
                <Input
                  type="date"
                  value={row.dueDate}
                  onChange={(e) => setInstallments((c) => c.map((r, i) => (i === index ? { ...r, dueDate: e.target.value } : r)))}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(index)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Create plan"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
