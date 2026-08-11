"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PartnerLinkActions({
  partnerId,
  placementUrl,
  regenerateField = "regenerateAccessCode",
}: {
  partnerId: string;
  placementUrl: string;
  regenerateField?: "regenerateAccessCode" | "regenerateManagementCode";
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(placementUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerate() {
    if (!window.confirm("Generate a new link? The old one will stop working immediately.")) return;
    setRegenerating(true);
    await fetch(`/api/v1/partners/${partnerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [regenerateField]: true }),
    });
    setRegenerating(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copyLink}>
        <Copy className="size-3.5" /> {copied ? "Copied!" : "Copy link"}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={regenerating} onClick={regenerate}>
        <RefreshCw className="size-3.5" /> New link
      </Button>
    </div>
  );
}
