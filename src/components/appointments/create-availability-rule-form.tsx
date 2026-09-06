"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function CreateAvailabilityRuleForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState("30");
  const [generateWeeksAhead, setGenerateWeeksAhead] = useState("4");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  function toggleDay(value: number) {
    setDays((current) => (current.includes(value) ? current.filter((d) => d !== value) : [...current, value]));
  }

  async function submit() {
    if (days.length === 0) {
      setError("Pick at least one day");
      return;
    }
    setSubmitting(true);
    setError("");
    setResult("");
    const response = await fetch("/api/v1/availability-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        daysOfWeek: days,
        startTime,
        endTime,
        slotDurationMinutes: Number(slotDurationMinutes),
        meetingUrl: meetingUrl || undefined,
        notes: notes || undefined,
        generateWeeksAhead: Number(generateWeeksAhead),
      }),
    });
    const result_ = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result_.error?.message ?? "Unable to save pattern");
      return;
    }
    setResult(`Created ${result_.data.createdCount} slots.`);
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CalendarRange className="size-4" /> Set up recurring availability
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-300 p-4 dark:border-slate-700">
      <p className="font-semibold">Recurring weekly pattern</p>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => toggleDay(d.value)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              days.includes(d.value)
                ? "bg-teal-600 text-white"
                : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Start time</span>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">End time</span>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Slot length</span>
          <select className={fieldClassName} value={slotDurationMinutes} onChange={(e) => setSlotDurationMinutes(e.target.value)}>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="45">45 min</option>
            <option value="60">60 min</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Meeting link (optional, applies to every generated slot)</span>
        <Input type="url" placeholder="https://..." value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Notes (optional)</span>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <label className="block max-w-[160px]">
        <span className="mb-1 block text-xs font-medium text-slate-500">Generate weeks ahead</span>
        <Input type="number" min={1} max={12} value={generateWeeksAhead} onChange={(e) => setGenerateWeeksAhead(e.target.value)} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && <p className="text-sm text-teal-700">{result}</p>}
      <div className="flex gap-2">
        <Button disabled={submitting} onClick={submit}>
          {submitting ? "Generating…" : "Save & generate slots"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </div>
  );
}
