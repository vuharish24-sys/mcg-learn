"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (!window.confirm("Cancel this appointment?")) return;
    setSubmitting(true);
    setError("");
    const response = await fetch(`/api/v1/appointments/${appointmentId}/cancel`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to cancel");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" className="text-red-700" disabled={submitting} onClick={cancel}>
        {submitting ? "Cancelling…" : "Cancel"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
