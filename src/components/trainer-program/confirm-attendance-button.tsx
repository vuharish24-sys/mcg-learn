"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ConfirmAttendanceButton({ attendanceId }: { attendanceId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/v1/class-session-attendances/${attendanceId}/confirm`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to confirm");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button size="sm" disabled={busy} onClick={confirm}>{busy ? "Confirming…" : "Confirm attendance"}</Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
