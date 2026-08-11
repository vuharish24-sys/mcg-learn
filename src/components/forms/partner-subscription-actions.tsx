"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PartnerSubscriptionActions({ id }: { id: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function setStatus(status: "APPROVED" | "REJECTED") {
    setSubmitting(true);
    await fetch(`/api/v1/partners/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" disabled={submitting} onClick={() => setStatus("APPROVED")}>
        Approve
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={() => setStatus("REJECTED")}>
        Reject
      </Button>
    </div>
  );
}
