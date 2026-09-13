"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export function LearningPathModuleForm({
  learningPathId,
  moduleId,
  initial,
}: {
  learningPathId: string;
  moduleId?: string;
  initial?: { title: string; description: string; sortOrder: number; priceInPaise: number | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(moduleId);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError("");
    const priceRupees = formData.get("priceRupees");
    const payload = {
      ...(isEdit ? {} : { learningPathId }),
      title: formData.get("title"),
      description: formData.get("description") || null,
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      priceInPaise: priceRupees ? Math.round(Number(priceRupees) * 100) : null,
    };

    const endpoint = isEdit ? `/api/v1/learning-path-modules/${moduleId}` : "/api/v1/learning-path-modules";
    const response = await fetch(endpoint, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save module");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!moduleId) return;
    if (!window.confirm("Delete this module? Its lessons stay in the path but become ungrouped.")) return;
    setSubmitting(true);
    const response = await fetch(`/api/v1/learning-path-modules/${moduleId}`, { method: "DELETE" });
    setSubmitting(false);
    if (response.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button type="button" variant={isEdit ? "outline" : "outline"} size="sm" onClick={() => setOpen(true)}>
        {isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
        {isEdit ? "Edit" : "Add module"}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{isEdit ? "Edit module" : "Add module"}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
        </div>
        <form action={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Title</span>
            <Input name="title" required defaultValue={initial?.title} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Description (optional)</span>
            <Textarea name="description" defaultValue={initial?.description} rows={2} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Sort order</span>
            <Input name="sortOrder" type="number" min={0} defaultValue={initial?.sortOrder ?? 0} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Price to buy this module alone (₹, optional)</span>
            <Input
              name="priceRupees"
              type="number"
              min={1}
              step="0.01"
              defaultValue={initial?.priceInPaise ? initial.priceInPaise / 100 : ""}
              placeholder="Leave blank if not separately for sale"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            {isEdit && (
              <Button type="button" variant="ghost" className="mr-auto text-red-700" disabled={submitting} onClick={remove}>
                <Trash2 className="size-4" /> Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save module"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
