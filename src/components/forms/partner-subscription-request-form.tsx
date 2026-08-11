"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Partner = { id: string; name: string };
type ExistingRequest = { targetPartnerId: string; status: string };

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Request sent — awaiting approval",
  APPROVED: "Access granted",
  REJECTED: "Request declined",
};

export function PartnerSubscriptionRequestForm({
  accessCode,
  partners,
  existingRequests,
}: {
  accessCode: string;
  partners: Partner[];
  existingRequests: ExistingRequest[];
}) {
  const [statusByPartner, setStatusByPartner] = useState<Record<string, string>>(() =>
    Object.fromEntries(existingRequests.map((r) => [r.targetPartnerId, r.status])),
  );
  const [pendingSubmit, setPendingSubmit] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function request(targetPartnerId: string) {
    setPendingSubmit(targetPartnerId);
    setError("");
    const response = await fetch("/api/v1/partners/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestingAccessCode: accessCode, targetPartnerId }),
    });
    const result = await response.json();
    setPendingSubmit(null);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to send request");
      return;
    }
    setStatusByPartner((prev) => ({ ...prev, [targetPartnerId]: result.data.status }));
  }

  return (
    <div className="space-y-2">
      {partners.map((p) => {
        const status = statusByPartner[p.id];
        return (
          <div
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
          >
            <p className="text-sm font-medium">{p.name}</p>
            {status ? (
              <span className="text-xs text-slate-500">{STATUS_LABEL[status] ?? status}</span>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingSubmit === p.id}
                onClick={() => request(p.id)}
              >
                {pendingSubmit === p.id ? "Sending…" : "Request access"}
              </Button>
            )}
          </div>
        );
      })}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
