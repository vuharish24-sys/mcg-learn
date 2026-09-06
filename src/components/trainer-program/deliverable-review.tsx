"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeliverableReview({ deliverableId }: { deliverableId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(status: "APPROVED" | "REJECTED" | "NEEDS_REVISION") {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/v1/deliverables/${deliverableId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save decision");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => decide("APPROVED")}>Approve & pay</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("NEEDS_REVISION")}>Needs revision</Button>
        <Button size="sm" variant="outline" className="text-red-700" disabled={busy} onClick={() => decide("REJECTED")}>Reject</Button>
      </div>
    </div>
  );
}
