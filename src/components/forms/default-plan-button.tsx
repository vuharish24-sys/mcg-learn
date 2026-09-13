"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DefaultPlanButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function markDefaulted() {
    if (!window.confirm("Mark this plan as defaulted? The learner loses access to this unit immediately.")) return;
    setSubmitting(true);
    const response = await fetch(`/api/v1/installment-plans/${planId}/default`, { method: "POST" });
    setSubmitting(false);
    if (response.ok) router.refresh();
  }

  return (
    <Button variant="outline" size="sm" className="text-red-700" disabled={submitting} onClick={markDefaulted}>
      Mark defaulted
    </Button>
  );
}
