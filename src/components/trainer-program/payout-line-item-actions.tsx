"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PayoutLineItemActions({ id, status }: { id: string; status: "PENDING" | "APPROVED" | "PAID" | "REJECTED" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  async function approve() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/v1/payout-line-items/${id}/approve`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to approve");
      return;
    }
    router.refresh();
  }

  async function pay() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/v1/payout-line-items/${id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentReference: reference || undefined }),
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to mark paid");
      return;
    }
    setShowPayForm(false);
    router.refresh();
  }

  if (status === "PAID" || status === "REJECTED") return null;

  if (status === "PENDING") {
    return (
      <div className="space-y-1">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button size="sm" disabled={busy} onClick={approve}>Approve</Button>
      </div>
    );
  }

  // APPROVED
  if (showPayForm) {
    return (
      <div className="flex items-center gap-2">
        <Input placeholder="Payment reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} className="h-8 w-40 text-xs" />
        <Button size="sm" disabled={busy} onClick={pay}>Mark paid</Button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={() => setShowPayForm(true)}>
      Mark paid
    </Button>
  );
}
