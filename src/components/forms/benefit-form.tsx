"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";
import { MediaUploadField } from "@/components/media/media-upload-field";

type BenefitKind = "DISCOUNT_FLAT" | "DISCOUNT_PERCENT" | "PROMO_CODE" | "PERK";

function toLocalInput(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 16);
}

export function BenefitForm({
  benefitId,
  initial,
}: {
  benefitId?: string;
  initial?: {
    title: string;
    kind: BenefitKind;
    code: string | null;
    discountAmount: number | null;
    discountPercent: number | null;
    description: string | null;
    imageUrl: string | null;
    startsAt: string | null;
    expiresAt: string | null;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<BenefitKind>(initial?.kind ?? "DISCOUNT_FLAT");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError("");
    const payload = {
      title: formData.get("title"),
      kind: formData.get("kind"),
      code: formData.get("code") || null,
      discountAmount: formData.get("discountAmount") || null,
      discountPercent: formData.get("discountPercent") || null,
      description: formData.get("description") || null,
      imageUrl: formData.get("imageUrl") || null,
      startsAt: formData.get("startsAt") || null,
      expiresAt: formData.get("expiresAt") || null,
      isActive: formData.get("isActive") === "on",
    };

    const endpoint = benefitId ? `/api/v1/benefits/${benefitId}` : "/api/v1/benefits";
    const response = await fetch(endpoint, {
      method: benefitId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save benefit");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!benefitId) return;
    if (!window.confirm("Delete this benefit? It will be unmapped from every course it's on.")) return;
    setSubmitting(true);
    const response = await fetch(`/api/v1/benefits/${benefitId}`, { method: "DELETE" });
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
        <Plus className="size-4" /> Add benefit
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{initial ? "Edit benefit" : "Add benefit"}</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="size-4" /></Button>
        </div>
        <form action={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Title</span>
            <Input name="title" required defaultValue={initial?.title} placeholder="Early Bird Offer" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Kind</span>
            <select
              name="kind"
              className={fieldClassName}
              value={kind}
              onChange={(e) => setKind(e.target.value as BenefitKind)}
            >
              <option value="DISCOUNT_FLAT">Flat discount (₹ off)</option>
              <option value="DISCOUNT_PERCENT">Percentage discount</option>
              <option value="PROMO_CODE">Promo code (no automatic price change)</option>
              <option value="PERK">Perk (non-monetary, e.g. free mock exam)</option>
            </select>
          </label>
          {kind === "DISCOUNT_FLAT" && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Discount amount (₹)</span>
              <Input name="discountAmount" type="number" min={0} defaultValue={initial?.discountAmount ?? ""} />
            </label>
          )}
          {kind === "DISCOUNT_PERCENT" && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Discount percent</span>
              <Input name="discountPercent" type="number" min={0} max={100} defaultValue={initial?.discountPercent ?? ""} />
            </label>
          )}
          {kind === "PERK" && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Estimated value (₹, optional)</span>
              <Input name="discountAmount" type="number" min={0} defaultValue={initial?.discountAmount ?? ""} placeholder="1000" />
              <span className="block text-xs text-slate-500">Shown for display only — a perk never changes the course fee.</span>
            </label>
          )}
          {(kind === "PROMO_CODE" || kind === "DISCOUNT_FLAT" || kind === "DISCOUNT_PERCENT" || kind === "PERK") && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Code (optional)</span>
              <Input name="code" defaultValue={initial?.code ?? ""} placeholder="MCGSTART3000" />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Description (optional)</span>
            <Textarea name="description" defaultValue={initial?.description ?? ""} placeholder="Shown alongside the benefit, useful for perks" />
          </label>
          <MediaUploadField
            name="imageUrl"
            label="Image (optional)"
            folder="benefits"
            defaultUrl={initial?.imageUrl ?? ""}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Starts</span>
              <Input name="startsAt" type="datetime-local" defaultValue={toLocalInput(initial?.startsAt ?? null)} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Expires</span>
              <Input name="expiresAt" type="datetime-local" defaultValue={toLocalInput(initial?.expiresAt ?? null)} />
            </label>
          </div>
          <p className="text-xs text-slate-500">Leave either blank for no start/end limit.</p>
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
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save benefit"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
