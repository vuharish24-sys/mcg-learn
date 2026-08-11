"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { MediaUploadField } from "@/components/media/media-upload-field";

function toLocalInput(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export function PartnerForm({
  initial,
  partnerId,
}: {
  initial?: {
    name: string;
    slug: string;
    logoUrl: string | null;
    status: string;
    accessStartsAt: string | null;
    accessEndsAt: string | null;
    contactName: string | null;
    contactEmail: string | null;
  };
  partnerId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError("");
    const payload = {
      name: formData.get("name"),
      slug: formData.get("slug"),
      logoUrl: formData.get("logoUrl") || null,
      status: formData.get("status"),
      accessStartsAt: formData.get("accessStartsAt") || null,
      accessEndsAt: formData.get("accessEndsAt") || null,
      contactName: formData.get("contactName") || null,
      contactEmail: formData.get("contactEmail") || null,
    };

    const endpoint = partnerId ? `/api/v1/partners/${partnerId}` : "/api/v1/partners";
    const response = await fetch(endpoint, {
      method: partnerId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save partner");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!partnerId) return;
    if (!window.confirm("Remove this partner? Their access link will stop working immediately.")) return;
    setSubmitting(true);
    const response = await fetch(`/api/v1/partners/${partnerId}`, { method: "DELETE" });
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
        <Plus className="size-4" /> Add partner
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{initial ? "Edit partner" : "Add partner"}</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
        </div>
        <form action={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Institute name</span>
            <Input name="name" required defaultValue={initial?.name} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Slug</span>
            <Input name="slug" required pattern="[a-z0-9-]+" defaultValue={initial?.slug} placeholder="acme-institute" />
          </label>
          <MediaUploadField name="logoUrl" label="Institute logo" folder="general" purpose="image" defaultUrl={initial?.logoUrl ?? ""} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Status</span>
            <select name="status" defaultValue={initial?.status ?? "ACTIVE"} className={fieldClassName}>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Access starts</span>
              <Input name="accessStartsAt" type="datetime-local" defaultValue={toLocalInput(initial?.accessStartsAt ?? null)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Access ends</span>
              <Input name="accessEndsAt" type="datetime-local" defaultValue={toLocalInput(initial?.accessEndsAt ?? null)} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Leave either blank for no start/end limit.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Contact name</span>
              <Input name="contactName" defaultValue={initial?.contactName ?? ""} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Contact email</span>
              <Input name="contactEmail" type="email" defaultValue={initial?.contactEmail ?? ""} />
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            {initial && (
              <Button type="button" variant="ghost" className="mr-auto text-red-700" disabled={submitting} onClick={remove}>
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save partner"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
