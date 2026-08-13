"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";

type CourseCtaType = "LINK" | "FORM" | "NONE";

type BenefitOption = {
  id: string;
  title: string;
  kind: "DISCOUNT_FLAT" | "DISCOUNT_PERCENT" | "PROMO_CODE" | "PERK";
  discountAmount: number | null;
  discountPercent: number | null;
};

type VariantState = {
  id: string;
  mode: string;
  tier: string;
  fee: string;
  duration: string;
  startDate: string;
  ctaType: CourseCtaType;
  ctaLabel: string;
  ctaUrl: string;
  benefitIds: string[];
};

type CourseContentState = {
  instructor: string;
  variants: VariantState[];
};

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyVariant(): VariantState {
  return {
    id: newId(),
    mode: "",
    tier: "",
    fee: "",
    duration: "",
    startDate: "",
    ctaType: "NONE",
    ctaLabel: "",
    ctaUrl: "",
    benefitIds: [],
  };
}

function parseInitial(raw: string): CourseContentState {
  if (!raw.trim()) return { instructor: "", variants: [emptyVariant()] };
  try {
    const parsed = JSON.parse(raw);
    const course = parsed?.course;
    if (!course || typeof course !== "object") return { instructor: "", variants: [emptyVariant()] };

    const benefitsByVariant = new Map<string, string[]>();
    if (Array.isArray(parsed.variantBenefits)) {
      for (const row of parsed.variantBenefits) {
        if (row && typeof row.variantId === "string" && Array.isArray(row.benefitIds)) {
          benefitsByVariant.set(row.variantId, row.benefitIds.filter((id: unknown) => typeof id === "string"));
        }
      }
    }

    const variants: VariantState[] = Array.isArray(course.variants) && course.variants.length > 0
      ? course.variants.map((v: Record<string, unknown>) => {
          const id = typeof v.id === "string" && v.id ? v.id : newId();
          return {
            id,
            mode: typeof v.mode === "string" ? v.mode : "",
            tier: typeof v.tier === "string" ? v.tier : "",
            fee: typeof v.fee === "string" ? v.fee : "",
            duration: typeof v.duration === "string" ? v.duration : "",
            startDate: typeof v.startDate === "string" ? v.startDate : "",
            ctaType: v.ctaType === "LINK" || v.ctaType === "FORM" ? v.ctaType : "NONE",
            ctaLabel: typeof v.ctaLabel === "string" ? v.ctaLabel : "",
            ctaUrl: typeof v.ctaUrl === "string" ? v.ctaUrl : "",
            benefitIds: benefitsByVariant.get(id) ?? [],
          };
        })
      : [emptyVariant()];
    return {
      instructor: typeof course.instructor === "string" ? course.instructor : "",
      variants,
    };
  } catch {
    return { instructor: "", variants: [emptyVariant()] };
  }
}

function toContentJson(state: CourseContentState) {
  const activeVariants = state.variants.filter((v) => v.mode.trim());
  return JSON.stringify({
    course: {
      ...(state.instructor.trim() ? { instructor: state.instructor.trim() } : {}),
      variants: activeVariants.map((v) => ({
        id: v.id,
        mode: v.mode.trim(),
        ...(v.tier.trim() ? { tier: v.tier.trim() } : {}),
        ...(v.fee.trim() ? { fee: v.fee.trim() } : {}),
        ...(v.duration.trim() ? { duration: v.duration.trim() } : {}),
        ...(v.startDate.trim() ? { startDate: v.startDate.trim() } : {}),
        ctaType: v.ctaType,
        ...(v.ctaType !== "NONE" && v.ctaLabel.trim() ? { ctaLabel: v.ctaLabel.trim() } : {}),
        ...(v.ctaType === "LINK" && v.ctaUrl.trim() ? { ctaUrl: v.ctaUrl.trim() } : {}),
      })),
    },
    variantBenefits: activeVariants.map((v) => ({ variantId: v.id, benefitIds: v.benefitIds })),
  });
}

function benefitOptionLabel(benefit: BenefitOption) {
  if (benefit.kind === "DISCOUNT_FLAT") return `${benefit.title} — ₹${benefit.discountAmount ?? 0} off`;
  if (benefit.kind === "DISCOUNT_PERCENT") return `${benefit.title} — ${benefit.discountPercent ?? 0}% off`;
  if (benefit.kind === "PROMO_CODE") return `${benefit.title} — promo code`;
  return benefit.discountAmount ? `${benefit.title} — perk, est. value ₹${benefit.discountAmount}` : `${benefit.title} — perk`;
}

export function CourseContentFields({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [state, setState] = useState<CourseContentState>(() => parseInitial(defaultValue));
  const [benefits, setBenefits] = useState<BenefitOption[]>([]);

  useEffect(() => {
    fetch("/api/v1/benefits")
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (Array.isArray(result?.data)) setBenefits(result.data);
      })
      .catch(() => {});
  }, []);

  function updateVariant<K extends keyof VariantState>(index: number, key: K, value: VariantState[K]) {
    setState((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  }

  function toggleBenefit(index: number, benefitId: string) {
    setState((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => {
        if (i !== index) return v;
        const has = v.benefitIds.includes(benefitId);
        return { ...v, benefitIds: has ? v.benefitIds.filter((id) => id !== benefitId) : [...v.benefitIds, benefitId] };
      }),
    }));
  }

  function addVariant() {
    setState((prev) => ({ ...prev, variants: [...prev.variants, emptyVariant()] }));
  }

  function removeVariant(index: number) {
    setState((prev) => ({
      ...prev,
      variants: prev.variants.length > 1 ? prev.variants.filter((_, i) => i !== index) : prev.variants,
    }));
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
      <span className="block text-sm font-medium">Course details</span>
      <input type="hidden" name={name} value={toContentJson(state)} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Instructor</span>
        <Input
          value={state.instructor}
          onChange={(e) => setState((prev) => ({ ...prev, instructor: e.target.value }))}
        />
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            Priced options — one row per tier/mode combination (e.g. Batch Classes Online, One-to-One Offline)
          </span>
          <Button type="button" variant="outline" size="sm" onClick={addVariant}>
            <Plus className="size-3.5" /> Add option
          </Button>
        </div>

        {state.variants.map((variant, index) => (
          <div key={variant.id} className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Option {index + 1}</span>
              {state.variants.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(index)}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Tier (optional)</span>
                <Input
                  value={variant.tier}
                  onChange={(e) => updateVariant(index, "tier", e.target.value)}
                  placeholder="Batch Classes / One-to-One"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Mode</span>
                <select
                  className={fieldClassName}
                  value={variant.mode}
                  onChange={(e) => updateVariant(index, "mode", e.target.value)}
                >
                  <option value="">Select mode</option>
                  <option value="Online">Online</option>
                  <option value="Offline">Offline</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Fee</span>
                <Input
                  value={variant.fee}
                  onChange={(e) => updateVariant(index, "fee", e.target.value)}
                  placeholder="₹15,000 or Free"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Duration</span>
                <Input
                  value={variant.duration}
                  onChange={(e) => updateVariant(index, "duration", e.target.value)}
                  placeholder="6 weeks"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Start date</span>
                <Input
                  type="date"
                  value={variant.startDate}
                  onChange={(e) => updateVariant(index, "startDate", e.target.value)}
                />
              </label>
            </div>

            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Benefits mapped to this option (optional)
              </span>
              {benefits.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No benefits created yet — add one from Admin &gt; Course Benefits.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                  {benefits.map((benefit) => (
                    <label key={benefit.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="size-3.5 accent-teal-700"
                        checked={variant.benefitIds.includes(benefit.id)}
                        onChange={() => toggleBenefit(index, benefit.id)}
                      />
                      {benefitOptionLabel(benefit)}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Enrollment button</span>
              <select
                className={fieldClassName}
                value={variant.ctaType}
                onChange={(e) => updateVariant(index, "ctaType", e.target.value as CourseCtaType)}
              >
                <option value="NONE">No button — display only</option>
                <option value="LINK">Link — send learners to an external enrollment/payment page</option>
                <option value="FORM">Form — collect learner details as a CRM lead</option>
              </select>
            </label>

            {variant.ctaType !== "NONE" && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Button label</span>
                <Input
                  value={variant.ctaLabel}
                  onChange={(e) => updateVariant(index, "ctaLabel", e.target.value)}
                  placeholder="Enroll Now"
                />
              </label>
            )}

            {variant.ctaType === "LINK" && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">Destination URL</span>
                <Input
                  type="url"
                  value={variant.ctaUrl}
                  onChange={(e) => updateVariant(index, "ctaUrl", e.target.value)}
                  placeholder="https://..."
                />
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
