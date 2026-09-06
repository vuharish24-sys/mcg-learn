"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function AvailabilityRuleRow({
  rule,
}: {
  rule: { id: string; daysOfWeek: number[]; startTime: string; endTime: string; slotDurationMinutes: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generateMore() {
    setBusy(true);
    setMessage("");
    const response = await fetch(`/api/v1/availability-rules/${rule.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeksAhead: 4 }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error?.message ?? "Unable to generate");
      return;
    }
    setMessage(`Created ${result.data.createdCount} more slots.`);
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Remove this recurring pattern? Already-generated slots stay untouched.")) return;
    setBusy(true);
    const response = await fetch(`/api/v1/availability-rules/${rule.id}`, { method: "DELETE" });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  const days = rule.daysOfWeek
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d])
    .join(", ");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm dark:border-slate-800">
      <div>
        <p className="font-medium">{days}</p>
        <p className="text-slate-500">
          {rule.startTime}–{rule.endTime} · {rule.slotDurationMinutes}-min slots
        </p>
        {message && <p className="text-xs text-teal-700">{message}</p>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={generateMore}>
          Generate 4 more weeks
        </Button>
        <Button size="sm" variant="ghost" className="text-red-700" disabled={busy} onClick={remove}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
