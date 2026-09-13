"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RequestTutorSessionForm({ trainerId }: { trainerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [preferredAt, setPreferredAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/v1/tutor-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerId, topic, preferredAt, durationMinutes: Number(durationMinutes) }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to submit request");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) return <p className="text-xs font-medium text-teal-700">Request sent — check My Sessions for the quote.</p>;

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Request a session
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 dark:border-slate-800">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Topic</span>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. CPC exam prep" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Preferred date &amp; time</span>
        <Input type="datetime-local" value={preferredAt} onChange={(e) => setPreferredAt(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Duration (minutes)</span>
        <Input type="number" min={15} max={240} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || !topic.trim() || !preferredAt} onClick={submit}>
          Send request
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
