"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteSlotButton({ slotId }: { slotId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm("Remove this open slot?")) return;
    setSubmitting(true);
    setError("");
    const response = await fetch(`/api/v1/appointment-slots/${slotId}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to remove");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="ghost" className="text-red-700" disabled={submitting} onClick={remove}>
        <Trash2 className="size-3.5" /> Remove
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
