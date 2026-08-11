"use client";

import { useState } from "react";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function JobInterestForm({
  feedItemId,
  partnerAccessCode,
  initial,
}: {
  feedItemId: string;
  partnerAccessCode?: string;
  initial?: { fullName?: string; email?: string; phone?: string };
}) {
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const response = await fetch(`/api/v1/jobs/${feedItemId}/interest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedItemId, fullName, email: email || null, phone, notes, partnerAccessCode }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to submit — please try again");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="rounded-lg bg-teal-50 p-4 text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
        Thanks — your interest has been recorded. Someone from the team will reach out.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Full name</span>
        <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Phone</span>
        <Input required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Anything else? (optional)</span>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" variant="gradient" disabled={submitting} className="w-full">
        {submitting ? "Submitting…" : "Submit interest"}
      </Button>
    </form>
  );
}
