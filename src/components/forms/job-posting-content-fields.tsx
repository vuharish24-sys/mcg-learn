"use client";

import { useState } from "react";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";

type JobCtaType = "LINK" | "FORM" | "NONE";

type JobContentState = {
  company: string;
  location: string;
  employmentType: string;
  eligibility: string;
  closesAt: string;
  ctaType: JobCtaType;
  ctaLabel: string;
  ctaUrl: string;
};

const EMPTY: JobContentState = {
  company: "",
  location: "",
  employmentType: "",
  eligibility: "",
  closesAt: "",
  ctaType: "NONE",
  ctaLabel: "",
  ctaUrl: "",
};

function parseInitial(raw: string): JobContentState {
  if (!raw.trim()) return EMPTY;
  try {
    const job = JSON.parse(raw)?.job;
    if (!job || typeof job !== "object") return EMPTY;
    return {
      company: job.company ?? "",
      location: job.location ?? "",
      employmentType: job.employmentType ?? "",
      eligibility: job.eligibility ?? "",
      closesAt: job.closesAt ?? "",
      ctaType: job.ctaType === "LINK" || job.ctaType === "FORM" ? job.ctaType : "NONE",
      ctaLabel: job.ctaLabel ?? "",
      ctaUrl: job.ctaUrl ?? "",
    };
  } catch {
    return EMPTY;
  }
}

function toContentJson(job: JobContentState) {
  return JSON.stringify({
    job: {
      ...(job.company.trim() ? { company: job.company.trim() } : {}),
      ...(job.location.trim() ? { location: job.location.trim() } : {}),
      ...(job.employmentType.trim() ? { employmentType: job.employmentType.trim() } : {}),
      ...(job.eligibility.trim() ? { eligibility: job.eligibility.trim() } : {}),
      ...(job.closesAt.trim() ? { closesAt: job.closesAt.trim() } : {}),
      ctaType: job.ctaType,
      ...(job.ctaType !== "NONE" && job.ctaLabel.trim() ? { ctaLabel: job.ctaLabel.trim() } : {}),
      ...(job.ctaType === "LINK" && job.ctaUrl.trim() ? { ctaUrl: job.ctaUrl.trim() } : {}),
    },
  });
}

export function JobPostingContentFields({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [job, setJob] = useState<JobContentState>(() => parseInitial(defaultValue));

  function update<K extends keyof JobContentState>(key: K, value: JobContentState[K]) {
    setJob((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
      <span className="block text-sm font-medium">Job details</span>
      <input type="hidden" name={name} value={toContentJson(job)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Company</span>
          <Input value={job.company} onChange={(e) => update("company", e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Location</span>
          <Input value={job.location} onChange={(e) => update("location", e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Employment type</span>
          <Input
            value={job.employmentType}
            onChange={(e) => update("employmentType", e.target.value)}
            placeholder="Full-time"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Closes on</span>
          <Input type="date" value={job.closesAt} onChange={(e) => update("closesAt", e.target.value)} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Eligibility</span>
        <Textarea
          value={job.eligibility}
          onChange={(e) => update("eligibility", e.target.value)}
          rows={2}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Apply button</span>
        <select
          className={fieldClassName}
          value={job.ctaType}
          onChange={(e) => update("ctaType", e.target.value as JobCtaType)}
        >
          <option value="NONE">No button — display only</option>
          <option value="LINK">Link — send applicants to an external URL or WhatsApp</option>
          <option value="FORM">Form — collect applicant details as a CRM lead</option>
        </select>
      </label>

      {job.ctaType !== "NONE" && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Button label</span>
          <Input
            value={job.ctaLabel}
            onChange={(e) => update("ctaLabel", e.target.value)}
            placeholder="Apply Now"
          />
        </label>
      )}

      {job.ctaType === "LINK" && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Destination URL</span>
          <Input
            type="url"
            value={job.ctaUrl}
            onChange={(e) => update("ctaUrl", e.target.value)}
            placeholder="https://... or https://wa.me/91XXXXXXXXXX"
          />
        </label>
      )}
    </div>
  );
}
