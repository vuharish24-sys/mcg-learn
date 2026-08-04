"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function FeedLeadForm({
  endpoint,
  submitLabel,
  defaultName,
  defaultEmail,
  defaultPhone,
}: {
  endpoint: string;
  submitLabel: string;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    setError("");
    setSuccess("");
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: formData.get("fullName"),
        email: formData.get("email") || null,
        phone: formData.get("phone"),
        notes: formData.get("notes") || null,
      }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to submit");
      return;
    }
    setSuccess("Submitted successfully.");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Full name</span>
        <Input name="fullName" required defaultValue={defaultName} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Phone</span>
        <Input name="phone" required defaultValue={defaultPhone} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Email</span>
        <Input name="email" type="email" defaultValue={defaultEmail} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Notes</span>
        <Textarea name="notes" placeholder="Optional details" />
      </label>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-800">{success}</p>}
      <Button disabled={submitting}>{submitting ? "Submitting…" : submitLabel}</Button>
    </form>
  );
}
