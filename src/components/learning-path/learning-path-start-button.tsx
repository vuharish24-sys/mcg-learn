"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LearningPathStartButton({
  learningPathId,
  started,
}: {
  learningPathId: string;
  started: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [optimisticallyStarted, setOptimisticallyStarted] = useState(false);

  async function start() {
    setLoading(true);
    const response = await fetch(`/api/v1/learning-paths/${learningPathId}/start`, { method: "POST" });
    if (response.ok) setOptimisticallyStarted(true);
    setLoading(false);
    router.refresh();
  }

  // Hide as soon as the request succeeds rather than waiting for router.refresh()'s
  // server round-trip — otherwise there's a window where the button looks clickable
  // again right after "Starting…" clears, inviting a double-click.
  if (started || optimisticallyStarted) return null;

  return (
    <Button
      onClick={start}
      disabled={loading}
      className="bg-white text-teal-900 hover:bg-teal-50"
    >
      {loading ? "Starting…" : "Start learning path"}
    </Button>
  );
}
