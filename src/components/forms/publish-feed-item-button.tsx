"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublishFeedItemButton({ id }: { id: string }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  async function publish() {
    setPublishing(true);
    const response = await fetch(`/api/v1/feed/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" }),
    });
    setPublishing(false);
    if (response.ok) router.refresh();
  }

  return (
    <Button variant="gradient" size="sm" disabled={publishing} onClick={publish}>
      <CheckCircle2 className="size-3.5" /> {publishing ? "Publishing…" : "Approve & Publish"}
    </Button>
  );
}
