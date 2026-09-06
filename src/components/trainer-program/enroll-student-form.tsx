"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EnrollStudentForm({ feedItemId }: { feedItemId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/v1/course-enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: email, feedItemId }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to enroll");
      return;
    }
    setOpen(false);
    setEmail("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Enroll a student
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="email" placeholder="Student email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 w-56 text-xs" />
      <Button size="sm" disabled={submitting || !email.trim()} onClick={submit}>Enroll</Button>
      <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
