"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";
import { feedTypes } from "@/lib/feed-form";
import { enumLabel } from "@/lib/utils";

export function GenerateFeedItemForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [type, setType] = useState<string>("ARTICLE");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [scheduledPublishAt, setScheduledPublishAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ title: string; description: string; thumbnailUrl: string | null } | null>(null);

  async function generate() {
    setSubmitting(true);
    setError("");
    setResult(null);
    const response = await fetch("/api/v1/feed/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        type,
        categoryId,
        scheduledPublishAt: scheduledPublishAt || null,
      }),
    });
    const payload = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Unable to generate content");
      return;
    }
    setResult({
      title: payload.data.title,
      description: payload.data.description,
      thumbnailUrl: payload.data.thumbnailUrl,
    });
    router.refresh();
  }

  function close() {
    setOpen(false);
    setTopic("");
    setScheduledPublishAt("");
    setResult(null);
    setError("");
  }

  if (!open) {
    return (
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Sparkles className="size-4" /> Generate with AI
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="size-5 text-violet-600" /> Generate with AI
          </h2>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
            <X />
          </Button>
        </div>

        {result ? (
          <div className="space-y-4">
            <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              Saved as a draft. Review and edit it in the list below before publishing.
            </p>
            {result.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.thumbnailUrl} alt="" className="aspect-video w-full rounded-lg object-cover" />
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p>
              <p className="font-semibold">{result.title}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{result.description}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>Close</Button>
              <Button variant="gradient" onClick={() => setResult(null)}>Generate another</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Topic or idea</span>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Why ICD-10 accuracy matters for insurance claims"
                rows={3}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Content type</span>
              <select className={fieldClassName} value={type} onChange={(e) => setType(e.target.value)}>
                {feedTypes.map((value) => (
                  <option key={value} value={value}>{enumLabel(value)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Category</span>
              <select className={fieldClassName} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Schedule publish (optional)</span>
              <Input
                type="datetime-local"
                value={scheduledPublishAt}
                onChange={(e) => setScheduledPublishAt(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                Leave blank to save as a draft you publish manually. Otherwise it auto-publishes at this time.
              </p>
            </label>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button
                variant="gradient"
                disabled={submitting || topic.trim().length < 3 || !categoryId}
                onClick={generate}
              >
                {submitting ? "Generating…" : "Generate"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
