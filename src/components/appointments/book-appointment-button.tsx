"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function BookAppointmentButton({ slotId }: { slotId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function book() {
    setSubmitting(true);
    setError("");
    const response = await fetch(`/api/v1/appointment-slots/${slotId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerNotes: notes || undefined }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to book this slot");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="gradient" onClick={() => setOpen(true)}>
        Book
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 sm:max-w-xs">
      <Textarea
        placeholder="What would you like to discuss? (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="gradient" disabled={submitting} onClick={book}>
          {submitting ? "Booking…" : "Confirm booking"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
