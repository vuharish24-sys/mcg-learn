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

  async function start() {
    setLoading(true);
    await fetch(`/api/v1/learning-paths/${learningPathId}/start`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  if (started) return null;

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
