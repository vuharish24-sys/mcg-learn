"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UnenrollButton({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Remove this student's enrollment? They'll lose access to this course's modules.")) return;
    setBusy(true);
    const response = await fetch(`/api/v1/course-enrollments/${enrollmentId}`, { method: "DELETE" });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" className="text-red-700" disabled={busy} onClick={remove}>
      <X className="size-3.5" />
    </Button>
  );
}
