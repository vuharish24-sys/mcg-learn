"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteModuleButton({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this module? Trainer assignments on it will be removed too.")) return;
    setBusy(true);
    const response = await fetch(`/api/v1/course-modules/${moduleId}`, { method: "DELETE" });
    setBusy(false);
    if (response.ok) router.refresh();
  }

  return (
    <Button size="sm" variant="ghost" className="text-red-700" disabled={busy} onClick={remove}>
      <Trash2 className="size-3.5" />
    </Button>
  );
}
