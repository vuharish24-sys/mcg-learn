"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function JoinReferralProgramForm() {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!termsAccepted || !privacyAccepted) {
      setError("Both checkboxes are required to join the Referral Program.");
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/v1/referrals/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termsAccepted, privacyAccepted }),
    });
    const payload = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setError(payload.error?.message ?? "Unable to join the Referral Program");
      return;
    }

    router.refresh();
    router.push("/referrals");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
        />
        <span>
          I have read and agree to the{" "}
          <Link href="/legal/referral-terms" target="_blank" className="font-semibold text-teal-700 underline">
            Referral Program Terms &amp; Conditions
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={privacyAccepted}
          onChange={(e) => setPrivacyAccepted(e.target.checked)}
        />
        <span>
          I agree to the{" "}
          <Link href="/legal/privacy" target="_blank" className="font-semibold text-teal-700 underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={submitting || !termsAccepted || !privacyAccepted}>
        {submitting ? "Joining…" : "Join Referral Program"}
      </Button>
    </form>
  );
}
