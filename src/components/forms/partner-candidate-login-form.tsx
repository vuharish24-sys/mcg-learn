"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PartnerCandidateLoginForm({ accessCode }: { accessCode: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const response = await fetch(`/api/v1/placements/${accessCode}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to verify your access");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-slate-500">
        Enter the email or phone number your institute registered with MCG Learn to view this board.
      </p>
      <Input
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        placeholder="Email or phone number"
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Checking…" : "View job board"}
      </Button>
    </form>
  );
}
