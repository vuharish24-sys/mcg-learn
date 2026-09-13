"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

export type BundleItemType = "LEARNING_PATH" | "LEARNING_PATH_MODULE" | "LEARNING_PATH_ITEM";
export type BundleItemOption = { type: BundleItemType; id: string; label: string };
type BundleItemValue = { type: BundleItemType; id: string };

function key(item: BundleItemValue): string {
  return `${item.type}:${item.id}`;
}

export function BundleForm({
  bundleId,
  itemOptions,
  initial,
}: {
  bundleId?: string;
  itemOptions: BundleItemOption[];
  initial?: {
    title: string;
    slug: string;
    description: string;
    priceInPaise: number;
    isActive: boolean;
    items: BundleItemValue[];
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(initial?.items.map(key) ?? []);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggle(k: string) {
    setSelectedKeys((current) => (current.includes(k) ? current.filter((x) => x !== k) : [...current, k]));
  }

  async function submit(formData: FormData) {
    if (selectedKeys.length < 2) {
      setError("Select at least 2 items for a bundle");
      return;
    }
    setSubmitting(true);
    setError("");
    const priceRupees = Number(formData.get("priceRupees"));
    const items: BundleItemValue[] = selectedKeys.map((k) => {
      const [type, id] = k.split(":") as [BundleItemType, string];
      return { type, id };
    });
    const payload = {
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      priceInPaise: Math.round(priceRupees * 100),
      isActive: formData.get("isActive") === "on",
      items,
    };

    const endpoint = bundleId ? `/api/v1/bundles/${bundleId}` : "/api/v1/bundles";
    const response = await fetch(endpoint, {
      method: bundleId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bundleId ? { ...payload, slug: undefined } : payload),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save bundle");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!bundleId) return;
    if (!window.confirm("Delete this bundle? Existing buyers keep access to the items they already purchased.")) return;
    setSubmitting(true);
    const response = await fetch(`/api/v1/bundles/${bundleId}`, { method: "DELETE" });
    setSubmitting(false);
    if (response.ok) {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open && initial) {
    return <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Edit</Button>;
  }
  if (!open) {
    return (
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add bundle
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{initial ? "Edit bundle" : "Add bundle"}</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
        </div>
        <form action={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Title</span>
            <Input name="title" required defaultValue={initial?.title} placeholder="CPC Career Bundle" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Slug</span>
            <Input name="slug" required pattern="[a-z0-9-]+" defaultValue={initial?.slug} disabled={Boolean(bundleId)} />
            {bundleId && <span className="block text-xs text-slate-500">Slug can&apos;t be changed after creation.</span>}
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Description</span>
            <Textarea name="description" required defaultValue={initial?.description} rows={3} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Bundle price (₹)</span>
            <Input
              name="priceRupees"
              type="number"
              min={1}
              step="0.01"
              required
              defaultValue={initial ? initial.priceInPaise / 100 : ""}
            />
          </label>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium">Items in this bundle (select at least 2 — courses, modules, or lessons)</span>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-3 dark:border-slate-700">
              {itemOptions.map((option) => {
                const k = key(option);
                return (
                  <label key={k} className="flex items-center gap-2 text-sm font-normal">
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(k)}
                      onChange={() => toggle(k)}
                      className="size-4 accent-teal-700"
                    />
                    {option.label}
                  </label>
                );
              })}
              {itemOptions.length === 0 && <p className="text-sm text-slate-500">No paid courses, modules, or lessons yet.</p>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="isActive" defaultChecked={initial?.isActive ?? true} className="size-4 accent-teal-700" />
            Active
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            {initial && (
              <Button type="button" variant="ghost" className="mr-auto text-red-700" disabled={submitting} onClick={remove}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save bundle"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
