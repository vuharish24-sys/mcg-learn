"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function CreateSlotForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/v1/appointment-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt, endsAt, meetingUrl: meetingUrl || undefined, notes: notes || undefined }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to create slot");
      return;
    }
    setOpen(false);
    setStartsAt("");
    setEndsAt("");
    setMeetingUrl("");
    setNotes("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Open a slot
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-300 p-4 dark:border-slate-700">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Starts</span>
          <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Ends</span>
          <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Meeting link (optional)</span>
        <Input type="url" placeholder="https://..." value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Notes (optional)</span>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What this slot is for" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button disabled={submitting || !startsAt || !endsAt} onClick={submit}>
          {submitting ? "Saving…" : "Save slot"}
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
