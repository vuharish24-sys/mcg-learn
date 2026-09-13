"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TutorSessionRequestReview({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [pricing, setPricing] = useState(false);
  const [rupees, setRupees] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(path: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/v1/tutor-sessions/${requestId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save");
      return;
    }
    router.refresh();
  }

  if (status !== "REQUESTED") return null;

  if (pricing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={1}
          step="0.01"
          placeholder="Price (₹)"
          value={rupees}
          onChange={(e) => setRupees(e.target.value)}
          className="w-32"
        />
        <Button size="sm" disabled={busy || !rupees} onClick={() => post("price", { priceAmountPaise: Math.round(Number(rupees) * 100) })}>
          Send quote
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPricing(false)}>Cancel</Button>
        {error && <p className="w-full text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => setPricing(true)}>Quote price</Button>
        <Button size="sm" variant="outline" className="text-red-700" disabled={busy} onClick={() => post("decline", {})}>
          Decline
        </Button>
      </div>
    </div>
  );
}
