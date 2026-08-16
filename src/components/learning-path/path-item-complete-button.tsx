"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RewardEarnedBanner } from "@/components/learning-path/reward-earned-banner";

export function PathItemCompleteButton({
  learningPathId,
  feedItemId,
  label = "Mark as Completed",
  advisingReady = true,
}: {
  learningPathId: string;
  feedItemId: string;
  label?: string;
  advisingReady?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [certificateJustIssued, setCertificateJustIssued] = useState(false);
  const [badgeJustIssued, setBadgeJustIssued] = useState(false);
  const [badgeIcon, setBadgeIcon] = useState<string | null>(null);
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
    setCertificateJustIssued(Boolean(payload.data?.certificateJustIssued));
    setBadgeJustIssued(Boolean(payload.data?.badgeJustIssued));
    setBadgeIcon(payload.data?.badgeIcon ?? null);
    router.refresh();
  }

  if (done) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium text-teal-700">
          <CheckCircle2 className="size-4" /> Lesson marked complete.
        </p>
        {certificateJustIssued && <RewardEarnedBanner kind="certificate" advisingReady={advisingReady} />}
        {badgeJustIssued && <RewardEarnedBanner kind="badge" icon={badgeIcon} advisingReady={advisingReady} />}
      </div>
    );
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
