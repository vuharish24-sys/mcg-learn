"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaViewButton } from "@/components/media/media-view-button";
import { enumLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Asset = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string | null;
  assetType: string;
  isActive: boolean;
};

export function CampaignAssetGallery({
  campaignId,
  assets,
}: {
  campaignId: string;
  assets: Asset[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function removeAsset(assetId: string) {
    if (!window.confirm("Remove this media from the campaign? This cannot be undone.")) return;
    setError("");
    setBusyId(assetId);
    const response = await fetch(`/api/v1/referral-campaigns/${campaignId}/manage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-asset", assetId }),
    });
    const result = await response.json();
    setBusyId(null);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to remove media");
      return;
    }
    router.refresh();
  }

  if (assets.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No assets uploaded yet. Use the panel below to add banners and images.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => (
          <div key={asset.id} className="overflow-hidden rounded-xl border dark:border-slate-800">
            {/\.(png|jpe?g|webp|gif)(\?|$)/i.test(asset.fileUrl) || asset.fileType?.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.fileUrl} alt={asset.fileName} className="h-36 w-full object-cover" />
            ) : (
              <div className="flex h-36 items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-900">
                {asset.fileName}
              </div>
            )}
            <div className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{asset.fileName}</p>
                  <p className="text-xs text-slate-500">{enumLabel(asset.assetType)}</p>
                </div>
                <Badge>{asset.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <MediaViewButton
                  url={asset.fileUrl}
                  fileName={asset.fileName}
                  fileType={asset.fileType}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-700"
                  disabled={busyId === asset.id}
                  onClick={() => removeAsset(asset.id)}
                >
                  <Trash2 className="size-3.5" />
                  {busyId === asset.id ? "Removing…" : "Remove"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
