"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";
import { MediaUploadField } from "@/components/media/media-upload-field";

type FeedOption = { value: string; label: string; type: string };
type PathItem = { feedItemId: string; sortOrder: number; isRequired: boolean; passPercentage: string };

export function LearningPathForm({
  feedItems,
  initial,
  endpoint,
  method = "POST",
}: {
  feedItems: FeedOption[];
  initial?: {
    title: string;
    slug: string;
    description: string;
    thumbnailUrl: string;
    estimatedDuration: string;
    difficulty: string;
    category: string;
    status: string;
    visibility: string;
    isFeatured: boolean;
    requiredQuizFeedItemId: string;
    quizPassPercentage: string;
    certificateTemplate?: string;
    rewardType?: string;
    badgeIcon?: string;
    items: PathItem[];
  };
  endpoint: string;
  method?: "POST" | "PATCH";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<PathItem[]>(
    initial?.items ?? [{ feedItemId: "", sortOrder: 0, isRequired: true, passPercentage: "" }],
  );
  const [requiredQuizFeedItemId, setRequiredQuizFeedItemId] = useState(
    initial?.requiredQuizFeedItemId ?? "",
  );
  const [rewardType, setRewardType] = useState(initial?.rewardType ?? "CERTIFICATE");

  const quizzesInPath = items
    .map((item) => feedItems.find((feed) => feed.value === item.feedItemId && feed.type === "QUIZ"))
    .filter((feed): feed is FeedOption => Boolean(feed));

  function addItem() {
    setItems((current) => [...current, { feedItemId: "", sortOrder: current.length, isRequired: true, passPercentage: "" }]);
  }

  function removeItem(index: number) {
    setItems((current) => {
      const next = current.filter((_, i) => i !== index).map((item, i) => ({ ...item, sortOrder: i }));
      if (requiredQuizFeedItemId && !next.some((item) => item.feedItemId === requiredQuizFeedItemId)) {
        setRequiredQuizFeedItemId("");
      }
      return next;
    });
  }

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError("");
    const payload = {
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      thumbnailUrl: formData.get("thumbnailUrl") || null,
      estimatedDuration: formData.get("estimatedDuration") ? Number(formData.get("estimatedDuration")) : null,
      difficulty: formData.get("difficulty"),
      category: formData.get("category"),
      status: formData.get("status"),
      visibility: formData.get("visibility"),
      isFeatured: formData.get("isFeatured") === "on",
      requiredQuizFeedItemId: requiredQuizFeedItemId || null,
      quizPassPercentage: Number(formData.get("quizPassPercentage") ?? 60),
      certificateTemplate: formData.get("certificateTemplate") || null,
      rewardType,
      badgeIcon: rewardType === "BADGE" ? formData.get("badgeIcon") || null : null,
      items: items
        .filter((item) => item.feedItemId)
        .map((item, index) => ({
          feedItemId: item.feedItemId,
          sortOrder: index,
          isRequired: item.isRequired,
          passPercentage: item.passPercentage ? Number(item.passPercentage) : null,
        })),
    };

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save learning path");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!initial) return;
    if (!window.confirm("Delete this learning path permanently? This cannot be undone.")) return;

    setSubmitting(true);
    setError("");
    const response = await fetch(endpoint, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to delete");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open && initial) {
    return <Button onClick={() => setOpen(true)}>Edit learning path</Button>;
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Create learning path</Button>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{initial ? "Edit learning path" : "Create learning path"}</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
        </div>
        <form action={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5"><span className="text-sm font-medium">Title</span><Input name="title" required defaultValue={initial?.title} className={fieldClassName} /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Slug</span><Input name="slug" required pattern="[a-z0-9-]+" defaultValue={initial?.slug} className={fieldClassName} /></label>
          </div>
          <label className="block space-y-1.5"><span className="text-sm font-medium">Description</span><Textarea name="description" required defaultValue={initial?.description} className={fieldClassName} rows={4} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <MediaUploadField
                name="thumbnailUrl"
                label="Thumbnail (upload or URL)"
                folder="feed"
                defaultUrl={initial?.thumbnailUrl ?? ""}
              />
            </label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Duration (minutes)</span><Input name="estimatedDuration" type="number" min={1} defaultValue={initial?.estimatedDuration} className={fieldClassName} /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Category</span><Input name="category" required defaultValue={initial?.category ?? "General"} className={fieldClassName} /></label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Difficulty</span>
              <select name="difficulty" defaultValue={initial?.difficulty ?? "BEGINNER"} className={fieldClassName}>
                <option value="BEGINNER">Beginner</option><option value="INTERMEDIATE">Intermediate</option><option value="ADVANCED">Advanced</option>
              </select>
            </label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Status</span>
              <select name="status" defaultValue={initial?.status ?? "DRAFT"} className={fieldClassName}>
                <option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Visibility</span>
              <select name="visibility" defaultValue={initial?.visibility ?? "PUBLIC"} className={fieldClassName}>
                <option value="PUBLIC">Public</option><option value="PRIVATE">Private</option>
              </select>
            </label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Required quiz (must be in path items)</span>
              <select
                name="requiredQuizFeedItemId"
                value={requiredQuizFeedItemId}
                onChange={(e) => setRequiredQuizFeedItemId(e.target.value)}
                className={fieldClassName}
              >
                <option value="">None</option>
                {quizzesInPath.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <span className="text-xs text-slate-500">Add a QUIZ Feed Item to the path first, then select it here.</span>
            </label>
            <label className="block space-y-1.5"><span className="text-sm font-medium">Quiz pass %</span><Input name="quizPassPercentage" type="number" min={0} max={100} defaultValue={initial?.quizPassPercentage ?? "60"} className={fieldClassName} /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={initial?.isFeatured} /> Featured path</label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Reward on completion</span>
              <select
                name="rewardType"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
                className={fieldClassName}
              >
                <option value="CERTIFICATE">Certificate — formal, numbered, publicly verifiable</option>
                <option value="BADGE">Badge — lightweight icon shown on My Achievements</option>
              </select>
            </label>
            {rewardType === "BADGE" ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Badge icon (emoji)</span>
                <Input name="badgeIcon" maxLength={8} placeholder="🏅" defaultValue={initial?.badgeIcon ?? ""} className={fieldClassName} />
              </label>
            ) : (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">Certificate template (optional)</span>
                <Input name="certificateTemplate" defaultValue={initial?.certificateTemplate ?? ""} className={fieldClassName} />
              </label>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between"><p className="font-semibold">Path items</p><Button type="button" variant="outline" size="sm" onClick={addItem}><Plus className="size-4" /> Add item</Button></div>
            {items.map((item, index) => (
              <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_80px_80px_auto] dark:border-slate-800">
                <select
                  value={item.feedItemId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setItems((current) =>
                      current.map((row, i) => (i === index ? { ...row, feedItemId: nextId } : row)),
                    );
                    if (
                      requiredQuizFeedItemId &&
                      item.feedItemId === requiredQuizFeedItemId &&
                      nextId !== requiredQuizFeedItemId
                    ) {
                      setRequiredQuizFeedItemId("");
                    }
                  }}
                  className={fieldClassName}
                >
                  <option value="">Select feed item</option>
                  {feedItems.map((feed) => <option key={feed.value} value={feed.value}>{feed.label} ({feed.type})</option>)}
                </select>
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={item.isRequired} onChange={(e) => setItems((current) => current.map((row, i) => i === index ? { ...row, isRequired: e.target.checked } : row))} /> Required</label>
                <Input placeholder="Pass %" value={item.passPercentage} onChange={(e) => setItems((current) => current.map((row, i) => i === index ? { ...row, passPercentage: e.target.value } : row))} />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            {initial && (
              <Button type="button" variant="ghost" className="mr-auto text-red-700" disabled={submitting} onClick={remove}>
                <Trash2 className="size-4" /> Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save learning path"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
