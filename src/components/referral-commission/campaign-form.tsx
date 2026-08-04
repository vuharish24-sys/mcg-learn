"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";
import {
  REFERRAL_CAMPAIGN_STATUSES,
  REFERRAL_COMMISSION_BASES,
  REFERRAL_COMMISSION_TYPES,
} from "@/lib/referral-commission";
import { enumLabel } from "@/lib/utils";

type CourseOption = { id: string; title: string };

type CampaignInitial = {
  id?: string;
  name?: string;
  shortTitle?: string | null;
  description?: string | null;
  campaignCode?: string;
  startsAt?: string;
  endsAt?: string;
  status?: string;
  priority?: number;
  maxReferrals?: number | null;
  termsVersion?: string;
  commissionType?: string;
  commissionBasis?: string;
  publishAsFeed?: boolean;
  isActive?: boolean;
  learningPathIds?: string[];
};

export function CampaignForm({
  courses,
  initial,
}: {
  courses: CourseOption[];
  initial?: CampaignInitial;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(
    initial?.learningPathIds ?? [],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      shortTitle: String(form.get("shortTitle") || "") || null,
      description: String(form.get("description") || "") || null,
      campaignCode: String(form.get("campaignCode") || "") || undefined,
      startsAt: String(form.get("startsAt") || ""),
      endsAt: String(form.get("endsAt") || ""),
      status: String(form.get("status") || "DRAFT"),
      priority: Number(form.get("priority") || 0),
      maxReferrals: form.get("maxReferrals") ? Number(form.get("maxReferrals")) : null,
      termsVersion: String(form.get("termsVersion") || ""),
      commissionType: String(form.get("commissionType") || ""),
      commissionBasis: String(form.get("commissionBasis") || ""),
      publishAsFeed: form.get("publishAsFeed") === "on",
      isActive: form.get("isActive") !== "off",
      learningPathIds: selectedCourses,
    };

    const endpoint = initial?.id
      ? `/api/v1/referral-campaigns/${initial.id}`
      : "/api/v1/referral-campaigns";
    const response = await fetch(endpoint, {
      method: initial?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save campaign");
      return;
    }
    router.push(`/admin/referral-commissions/campaigns/${result.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Campaign name</span>
          <Input name="name" required defaultValue={initial?.name} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Short title</span>
          <Input name="shortTitle" defaultValue={initial?.shortTitle ?? ""} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Campaign code</span>
          <Input name="campaignCode" placeholder="Auto if empty" defaultValue={initial?.campaignCode ?? ""} />
        </label>
        <label className="space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">Description</span>
          <Textarea name="description" defaultValue={initial?.description ?? ""} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Start date</span>
          <Input name="startsAt" type="datetime-local" required defaultValue={initial?.startsAt} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">End date</span>
          <Input name="endsAt" type="datetime-local" required defaultValue={initial?.endsAt} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Status</span>
          <select name="status" className={fieldClassName} defaultValue={initial?.status ?? "DRAFT"}>
            {REFERRAL_CAMPAIGN_STATUSES.map((status) => (
              <option key={status} value={status}>{enumLabel(status)}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Priority</span>
          <Input name="priority" type="number" min={0} defaultValue={initial?.priority ?? 0} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Max referrals</span>
          <Input
            name="maxReferrals"
            type="number"
            min={1}
            defaultValue={initial?.maxReferrals ?? ""}
            placeholder="Unlimited"
          />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Terms version</span>
          <Input name="termsVersion" required defaultValue={initial?.termsVersion ?? "RP-2026-01"} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Commission type</span>
          <select
            name="commissionType"
            className={fieldClassName}
            defaultValue={initial?.commissionType ?? "HYBRID"}
          >
            {REFERRAL_COMMISSION_TYPES.map((type) => (
              <option key={type} value={type}>{enumLabel(type)}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Commission basis</span>
          <select
            name="commissionBasis"
            className={fieldClassName}
            defaultValue={initial?.commissionBasis ?? "COURSE_FEE"}
          >
            {REFERRAL_COMMISSION_BASES.map((basis) => (
              <option key={basis} value={basis}>{enumLabel(basis)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Eligible courses (empty = all courses)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {courses.map((course) => {
            const checked = selectedCourses.includes(course.id);
            return (
              <label key={course.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setSelectedCourses((prev) =>
                      event.target.checked
                        ? [...prev, course.id]
                        : prev.filter((id) => id !== course.id),
                    );
                  }}
                />
                {course.title}
              </label>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : initial?.id ? "Update campaign" : "Create campaign"}
      </Button>
    </form>
  );
}
