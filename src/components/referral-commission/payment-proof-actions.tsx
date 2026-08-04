"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaViewButton } from "@/components/media/media-view-button";

export function PaymentProofActions({
  paymentId,
  attachments,
}: {
  paymentId: string;
  attachments: { id: string; fileName: string; fileUrl: string; fileType: string }[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!attachments.length) return <span>—</span>;

  async function remove(attachmentId: string) {
    if (!window.confirm("Remove this payment proof?")) return;
    setError("");
    setBusyId(attachmentId);
    const response = await fetch(
      `/api/v1/referral-commissions/payments/${paymentId}/attachments/${attachmentId}`,
      { method: "DELETE" },
    );
    const result = await response.json().catch(() => ({}));
    setBusyId(null);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to remove proof");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="flex flex-wrap items-center gap-1">
            <MediaViewButton
              url={attachment.fileUrl}
              label="View"
              fileName={attachment.fileName}
              fileType={attachment.fileType}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-red-700"
              disabled={busyId === attachment.id}
              onClick={() => remove(attachment.id)}
            >
              <Trash2 className="size-3.5" />
              {busyId === attachment.id ? "…" : "Remove"}
            </Button>
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
