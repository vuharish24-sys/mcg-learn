"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function LogClassSessionForm({ trainerAssignmentId }: { trainerAssignmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [attendeeEmails, setAttendeeEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    const emails = attendeeEmails.split(/[\n,]+/).map((e) => e.trim()).filter(Boolean);
    const response = await fetch("/api/v1/class-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trainerAssignmentId,
        scheduledAt,
        durationMinutes: Number(durationMinutes),
        meetingUrl: meetingUrl || undefined,
        notes: notes || undefined,
        attendeeEmails: emails,
      }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to log session");
      return;
    }
    setOpen(false);
    setScheduledAt("");
    setMeetingUrl("");
    setNotes("");
    setAttendeeEmails("");
    router.refresh();
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}>Log a class session</Button>;
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 dark:border-slate-800">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        <Input type="number" min={5} placeholder="Duration (minutes)" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
      </div>
      <Input type="url" placeholder="Meeting link (optional)" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
      <Textarea placeholder="Notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Textarea
        placeholder="Attendee emails, comma or newline separated"
        rows={2}
        value={attendeeEmails}
        onChange={(e) => setAttendeeEmails(e.target.value)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={submitting || !scheduledAt || !attendeeEmails.trim()} onClick={submit}>
          {submitting ? "Saving…" : "Log session"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
