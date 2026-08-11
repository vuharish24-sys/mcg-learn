"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import type { FormField } from "@/types/resource";
import { Button } from "@/components/ui/button";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";
import { MediaUploadField } from "@/components/media/media-upload-field";
import { JobPostingContentFields } from "@/components/forms/job-posting-content-fields";

export function ResourceCreateForm({
  title,
  endpoint,
  fields,
  method = "POST",
  initialValues,
  allowDelete = false,
  editLabel = "Edit",
}: {
  title: string;
  endpoint: string;
  fields: FormField[];
  method?: "POST" | "PATCH";
  initialValues?: Record<string, string | boolean | string[] | null | undefined>;
  allowDelete?: boolean;
  editLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isEdit = method === "PATCH";

  function fieldValue(field: FormField) {
    const fromInitial = initialValues?.[field.name];
    if (fromInitial !== undefined && fromInitial !== null) return String(fromInitial);
    return field.defaultValue ?? "";
  }

  function fieldChecked(field: FormField) {
    const fromInitial = initialValues?.[field.name];
    if (typeof fromInitial === "boolean") return fromInitial;
    return false;
  }

  function fieldMultiValues(field: FormField): string[] {
    const fromInitial = initialValues?.[field.name];
    if (Array.isArray(fromInitial)) return fromInitial.map(String);
    if (typeof fromInitial === "string" && fromInitial) {
      return fromInitial.split(",").map((v) => v.trim()).filter(Boolean);
    }
    return field.defaultValue ? field.defaultValue.split(",").map((v) => v.trim()).filter(Boolean) : [];
  }

  const typeField = fields.find((f) => f.name === "type");
  const [typeValue, setTypeValue] = useState(() => (typeField ? fieldValue(typeField) : ""));

  function isVisible(field: FormField) {
    if (!field.showWhen) return true;
    return field.showWhen.in.includes(typeValue);
  }

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError("");
    const payload = Object.fromEntries(
      fields.map((field) => {
        if (field.type === "multiselect") {
          const checked = formData.getAll(field.name).map(String);
          if (checked.length > 0) return [field.name, checked];
          // Hidden (showWhen didn't match) or nothing checked — fall back to the field default.
          return [field.name, field.defaultValue ? field.defaultValue.split(",").map((v) => v.trim()).filter(Boolean) : []];
        }
        const raw = formData.get(field.name);
        if (field.type === "checkbox") return [field.name, raw === "on"];
        if (field.type === "csv") {
          return [field.name, String(raw ?? "").split(",").map((v) => v.trim()).filter(Boolean)];
        }
        return [field.name, raw === "" ? null : raw];
      }),
    );

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!allowDelete || !isEdit) return;
    if (!window.confirm("Delete this item permanently? This cannot be undone.")) return;

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

  if (!open) {
    return (
      <Button variant={isEdit ? "outline" : "default"} onClick={() => setOpen(true)}>
        {isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
        {isEdit ? editLabel : title}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{isEdit ? editLabel : title}</h2>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
            <X />
          </Button>
        </div>
        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          {fields.filter(isVisible).map((field) => {
            // Multiselect renders its own nested <label>s per checkbox, so the
            // outer wrapper must be a <div> — nesting <label> inside <label> is invalid HTML.
            const Wrapper = field.type === "multiselect" ? "div" : "label";
            return (
            <Wrapper key={field.name} className={field.type === "textarea" || field.type === "multiselect" || (field.type === "url" && field.allowUpload) ? "sm:col-span-2" : ""}>
              {(field.type === "url" && field.allowUpload) || (field.name === "content" && typeValue === "JOB_POSTING") ? null : (
                <span className="mb-1.5 block text-sm font-medium">{field.label}</span>
              )}
              {field.name === "content" && typeValue === "JOB_POSTING" ? (
                <JobPostingContentFields name={field.name} defaultValue={fieldValue(field)} />
              ) : field.type === "textarea" ? (
                <Textarea
                  name={field.name}
                  required={field.required}
                  placeholder={field.placeholder}
                  defaultValue={fieldValue(field)}
                />
              ) : field.type === "select" ? (
                <select
                  className={fieldClassName}
                  name={field.name}
                  required={field.required}
                  defaultValue={fieldValue(field)}
                  onChange={field.name === "type" ? (e) => setTypeValue(e.target.value) : undefined}
                >
                  <option value="" disabled>
                    Select {field.label.toLowerCase()}
                  </option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "multiselect" ? (
                <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-input px-3 py-2.5">
                  {field.options?.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm font-normal">
                      <input
                        className="size-4 accent-teal-700"
                        type="checkbox"
                        name={field.name}
                        value={option.value}
                        defaultChecked={fieldMultiValues(field).includes(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ) : field.type === "checkbox" ? (
                <input
                  className="size-5 accent-teal-700"
                  name={field.name}
                  type="checkbox"
                  defaultChecked={fieldChecked(field)}
                />
              ) : field.type === "url" && field.allowUpload ? (
                <MediaUploadField
                  name={field.name}
                  label={field.label}
                  folder={field.uploadFolder ?? "feed"}
                  required={field.required}
                  defaultUrl={fieldValue(field)}
                />
              ) : (
                <Input
                  name={field.name}
                  type={field.type === "csv" ? "text" : field.type ?? "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  defaultValue={fieldValue(field)}
                />
              )}
            </Wrapper>
            );
          })}
          {error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
            {allowDelete && isEdit ? (
              <Button type="button" variant="outline" disabled={submitting} onClick={remove} className="text-red-700">
                <Trash2 className="size-4" /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
