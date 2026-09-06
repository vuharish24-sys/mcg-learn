"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ToggleAssignmentActive({ assignmentId, isActive }: { assignmentId: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const response = await fetch(`/api/v1/trainer-assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={toggle}>
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
