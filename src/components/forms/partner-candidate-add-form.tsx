"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PartnerCandidateAddForm({ managementCode }: { managementCode: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError("");
    const payload = {
      fullName: formData.get("fullName") || undefined,
      email: formData.get("email") || undefined,
      phone: formData.get("phone") || undefined,
    };
    const response = await fetch(`/api/v1/partners/manage/${managementCode}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to add candidate");
      return;
    }
    (document.getElementById("candidate-add-form") as HTMLFormElement | null)?.reset();
    router.refresh();
  }

  return (
    <form id="candidate-add-form" action={submit} className="space-y-3">
      <p className="font-semibold">Add a candidate</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input name="fullName" placeholder="Name (optional)" />
        <Input name="email" type="email" placeholder="Email" />
        <Input name="phone" placeholder="Phone" />
      </div>
      <p className="text-xs text-slate-500">Provide at least an email or a phone number.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Adding…" : "Add candidate"}
      </Button>
    </form>
  );
}
