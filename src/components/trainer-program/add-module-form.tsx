"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function AddModuleForm({ feedItemId, nextSortOrder }: { feedItemId: string; nextSortOrder: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/v1/course-modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedItemId, title, description: description || undefined, contentUrl: contentUrl || undefined, sortOrder: nextSortOrder }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to add module");
      return;
    }
    setOpen(false);
    setTitle("");
    setDescription("");
    setContentUrl("");
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Add module
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 dark:border-slate-800">
      <Input placeholder="Module title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Description (optional)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Input placeholder="Content URL — recorded video/material (optional)" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={submitting || !title.trim()} onClick={submit}>
          {submitting ? "Saving…" : "Save module"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
