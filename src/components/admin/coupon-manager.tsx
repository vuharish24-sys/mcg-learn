"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type TargetType =
  | "LEARNING_PATH"
  | "LEARNING_PATH_MODULE"
  | "LEARNING_PATH_ITEM"
  | "BUNDLE"
  | "TUTOR_LMS_COURSE"
  | "PRACTICE_LAB_EXAM"
  | "PROGRAM";
type TargetOption = { targetType: TargetType; targetId: string; label: string };

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discountType: "FLAT" | "PERCENT";
  discountValue: number;
  maxDiscountPaise: number | null;
  minAmountPaise: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  maxRedemptions: number | null;
  maxPerUser: number | null;
  targets: { targetType: TargetType; targetId: string }[];
  _count: { purchases: number };
};

type FormState = {
  code: string;
  description: string;
  discountType: "FLAT" | "PERCENT";
  /** Rupees for FLAT, percent for PERCENT. */
  discountValue: string;
  maxDiscountRupees: string;
  minAmountRupees: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  maxRedemptions: string;
  maxPerUser: string;
  targetKeys: string[];
};

const EMPTY: FormState = {
  code: "",
  description: "",
  discountType: "PERCENT",
  discountValue: "",
  maxDiscountRupees: "",
  minAmountRupees: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
  maxRedemptions: "",
  maxPerUser: "1",
  targetKeys: [],
};

const keyOf = (t: { targetType: string; targetId: string }) => `${t.targetType}:${t.targetId}`;
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const toPaise = (value: string) => (value.trim() ? Math.round(Number(value) * 100) : null);
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function fromCoupon(c: Coupon): FormState {
  return {
    code: c.code,
    description: c.description ?? "",
    discountType: c.discountType,
    discountValue: c.discountType === "FLAT" ? String(c.discountValue / 100) : String(c.discountValue),
    maxDiscountRupees: c.maxDiscountPaise ? String(c.maxDiscountPaise / 100) : "",
    minAmountRupees: c.minAmountPaise ? String(c.minAmountPaise / 100) : "",
    startsAt: toDateInput(c.startsAt),
    expiresAt: toDateInput(c.expiresAt),
    isActive: c.isActive,
    maxRedemptions: c.maxRedemptions ? String(c.maxRedemptions) : "",
    maxPerUser: c.maxPerUser ? String(c.maxPerUser) : "",
    targetKeys: c.targets.map(keyOf),
  };
}

function discountLabel(c: Coupon) {
  if (c.discountType === "FLAT") return `${rupees(c.discountValue)} off`;
  return `${c.discountValue}% off${c.maxDiscountPaise ? ` (max ${rupees(c.maxDiscountPaise)})` : ""}`;
}

export function CouponManager({ initialCoupons, targetOptions }: { initialCoupons: Coupon[]; targetOptions: TargetOption[] }) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [targetToAdd, setTargetToAdd] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const optionByKey = new Map(targetOptions.map((o) => [keyOf(o), o]));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function reload() {
    const res = await fetch("/api/v1/coupons");
    const payload = await res.json();
    if (res.ok) setCoupons(payload.data);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      // End date is inclusive: valid through the end of that day.
      const expiresAt = form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null;
      const body = {
        code: form.code,
        description: form.description || null,
        discountType: form.discountType,
        discountValue: form.discountType === "FLAT" ? toPaise(form.discountValue) : Number(form.discountValue),
        maxDiscountPaise: form.discountType === "PERCENT" ? toPaise(form.maxDiscountRupees) : null,
        minAmountPaise: toPaise(form.minAmountRupees),
        startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`).toISOString() : null,
        expiresAt,
        isActive: form.isActive,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        maxPerUser: form.maxPerUser ? Number(form.maxPerUser) : null,
        targets: form.targetKeys.map((key) => {
          const separator = key.indexOf(":");
          return { targetType: key.slice(0, separator), targetId: key.slice(separator + 1) };
        }),
      };
      const res = await fetch(editingId === "new" ? "/api/v1/coupons" : `/api/v1/coupons/${editingId}`, {
        method: editingId === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message ?? "Unable to save");
      await reload();
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove(coupon: Coupon) {
    if (!window.confirm(`Delete coupon ${coupon.code}? Past purchases keep their discounted price.`)) return;
    const res = await fetch(`/api/v1/coupons/${coupon.id}`, { method: "DELETE" });
    if (res.ok) await reload();
  }

  const form_ = editingId && (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            Code
            <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="e.g. CPC500" />
          </label>
          <label className="text-sm">
            Description (admin only, optional)
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>
          <label className="text-sm">
            Discount type
            <select
              value={form.discountType}
              onChange={(e) => set("discountType", e.target.value as FormState["discountType"])}
              className={fieldClassName}
            >
              <option value="PERCENT">Percentage off</option>
              <option value="FLAT">Fixed amount off (₹)</option>
            </select>
          </label>
          <label className="text-sm">
            {form.discountType === "PERCENT" ? "Percent off (1–100)" : "Amount off (₹)"}
            <Input type="number" min={1} value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)} />
          </label>
          {form.discountType === "PERCENT" && (
            <label className="text-sm">
              Maximum discount ₹ (optional)
              <Input type="number" min={1} value={form.maxDiscountRupees} onChange={(e) => set("maxDiscountRupees", e.target.value)} />
            </label>
          )}
          <label className="text-sm">
            Minimum price ₹ (optional)
            <Input type="number" min={1} value={form.minAmountRupees} onChange={(e) => set("minAmountRupees", e.target.value)} />
          </label>
          <label className="text-sm">
            Valid from (optional)
            <Input type="date" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
          </label>
          <label className="text-sm">
            Valid until, inclusive (optional)
            <Input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
          </label>
          <label className="text-sm">
            Total uses allowed (empty = unlimited)
            <Input type="number" min={1} value={form.maxRedemptions} onChange={(e) => set("maxRedemptions", e.target.value)} />
          </label>
          <label className="text-sm">
            Uses per learner (empty = unlimited)
            <Input type="number" min={1} value={form.maxPerUser} onChange={(e) => set("maxPerUser", e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Applies to</p>
          {form.targetKeys.length === 0 && <p className="text-sm text-slate-500">No items yet — pick at least one.</p>}
          <ul className="space-y-1">
            {form.targetKeys.map((key) => (
              <li key={key} className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700">
                <span>{optionByKey.get(key)?.label ?? `${key} (no longer for sale)`}</span>
                <Button type="button" variant="ghost" size="icon" onClick={() => set("targetKeys", form.targetKeys.filter((k) => k !== key))}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <select value={targetToAdd} onChange={(e) => setTargetToAdd(e.target.value)} className={`${fieldClassName} max-w-md`}>
              <option value="">Pick an item…</option>
              {targetOptions
                .filter((o) => !form.targetKeys.includes(keyOf(o)))
                .map((o) => (
                  <option key={keyOf(o)} value={keyOf(o)}>
                    {o.label}
                  </option>
                ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!targetToAdd}
              onClick={() => {
                set("targetKeys", [...form.targetKeys, targetToAdd]);
                setTargetToAdd("");
              }}
            >
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save coupon"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {editingId === null && (
        <Button
          onClick={() => {
            setForm(EMPTY);
            setError("");
            setEditingId("new");
          }}
        >
          <Plus className="size-4" /> New coupon
        </Button>
      )}
      {editingId === "new" && form_}

      {coupons.length === 0 && editingId === null && <p className="text-sm text-slate-500">No coupons yet.</p>}
      <div className="grid gap-4">
        {coupons.map((coupon) =>
          editingId === coupon.id ? (
            <div key={coupon.id}>{form_}</div>
          ) : (
            <Card key={coupon.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-lg font-bold">{coupon.code}</p>
                    <Badge>{discountLabel(coupon)}</Badge>
                    {!coupon.isActive && <Badge className="border border-slate-200 bg-transparent text-slate-500">Paused</Badge>}
                  </div>
                  {coupon.description && <p className="text-sm text-slate-500">{coupon.description}</p>}
                  <p className="text-xs text-slate-500">
                    Used {coupon._count.purchases}
                    {coupon.maxRedemptions ? ` of ${coupon.maxRedemptions}` : ""} times
                    {coupon.maxPerUser ? ` · ${coupon.maxPerUser} per learner` : ""}
                    {coupon.minAmountPaise ? ` · min price ${rupees(coupon.minAmountPaise)}` : ""}
                    {" · "}
                    {coupon.startsAt ? formatDate(coupon.startsAt) : "no start"} → {coupon.expiresAt ? formatDate(coupon.expiresAt) : "no expiry"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Applies to: {coupon.targets.map((t) => optionByKey.get(keyOf(t))?.label ?? "(item no longer for sale)").join("; ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={editingId !== null}
                    onClick={() => {
                      setForm(fromCoupon(coupon));
                      setError("");
                      setEditingId(coupon.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" disabled={editingId !== null} onClick={() => remove(coupon)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}
