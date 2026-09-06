"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarkModuleCompleteButton({ courseModuleId }: { courseModuleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function markComplete() {
    setBusy(true);
    const response = await fetch(`/api/v1/course-modules/${courseModuleId}/complete`, { method: "POST" });
    setBusy(false);
    if (response.ok) {
      setDone(true);
      router.refresh();
    }
  }

  if (done) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-teal-700">
        <CheckCircle2 className="size-4" /> Completed
      </p>
    );
  }

  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={markComplete}>
      {busy ? "Saving…" : "Mark complete"}
    </Button>
  );
}
