"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PathItemCompleteButton({
  learningPathId,
  feedItemId,
  label = "Mark as Completed",
}: {
  learningPathId: string;
  feedItemId: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function complete() {
    setLoading(true);
    setError("");
    const response = await fetch(`/api/v1/learning-paths/${learningPathId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedItemId }),
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Unable to mark complete");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return <p className="text-sm font-medium text-teal-700">Lesson marked complete.</p>;
  }

  return (
    <div className="space-y-2">
      <Button onClick={complete} disabled={loading} variant="outline">
        {loading ? "Saving…" : label}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
