"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PartnerCandidateEnrollToggle({ id, enrolled }: { id: string; enrolled: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function toggle() {
    setSubmitting(true);
    await fetch(`/api/v1/partners/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrolled: !enrolled }),
    });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={toggle}>
      {enrolled ? "Unenroll" : "Mark enrolled"}
    </Button>
  );
}
