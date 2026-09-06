"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function SubmitDeliverableForm({ trainerAssignmentId }: { trainerAssignmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/v1/deliverables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trainerAssignmentId, title, description: description || undefined, fileUrl: fileUrl || undefined }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to submit");
      return;
    }
    setOpen(false);
    setTitle("");
    setDescription("");
    setFileUrl("");
    router.refresh();
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}>Submit deliverable</Button>;
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 dark:border-slate-800">
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Description (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input type="url" placeholder="File / video link" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={submitting || !title.trim()} onClick={submit}>
          {submitting ? "Submitting…" : "Submit"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
