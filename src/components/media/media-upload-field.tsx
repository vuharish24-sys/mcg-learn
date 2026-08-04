"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaViewButton } from "@/components/media/media-view-button";

type UploadedMedia = {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

export function MediaUploadField({
  name = "fileUrl",
  label = "Image",
  folder = "general",
  purpose = "image",
  required = false,
  defaultUrl = "",
  accept = "image/jpeg,image/png,image/webp,image/gif",
  onUploaded,
}: {
  name?: string;
  label?: string;
  folder?: "referral-campaigns" | "referral-payments" | "feed" | "general";
  purpose?: "image" | "proof";
  required?: boolean;
  defaultUrl?: string;
  accept?: string;
  onUploaded?: (media: UploadedMedia) => void;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [metaName, setMetaName] = useState("");
  const [metaType, setMetaType] = useState("");
  const [metaSize, setMetaSize] = useState<number | "">("");

  function clearMedia() {
    setUrl("");
    setMetaName("");
    setMetaType("");
    setMetaSize("");
    setError("");
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    const body = new FormData();
    body.set("file", file);
    body.set("folder", folder);
    body.set("purpose", purpose);
    const response = await fetch("/api/v1/media/upload", { method: "POST", body });
    const result = await response.json();
    setUploading(false);
    event.target.value = "";
    if (!response.ok) {
      setError(result.error?.message ?? "Upload failed");
      return;
    }
    const media = result.data as UploadedMedia;
    setUrl(media.fileUrl);
    setMetaName(media.fileName);
    setMetaType(media.fileType);
    setMetaSize(media.fileSize);
    onUploaded?.(media);
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <span className="block text-sm font-medium">{label}</span>
      <p className="text-xs text-slate-500">
        Upload a file to Supabase Storage, or paste an existing URL.
      </p>
      <Input
        type="file"
        accept={accept}
        disabled={uploading}
        onChange={onFileChange}
        className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-teal-800"
      />
      {uploading && <p className="text-xs text-teal-700">Uploading…</p>}
      <div className="flex flex-wrap gap-2">
        <Input
          name={name}
          type="url"
          required={required}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://… or upload above"
          className="min-w-[12rem] flex-1"
        />
        {url && (
          <Button type="button" variant="outline" onClick={clearMedia}>
            Clear
          </Button>
        )}
      </div>
      {metaName && <input type="hidden" name="fileName" value={metaName} />}
      {metaType && <input type="hidden" name="fileType" value={metaType} />}
      {metaSize !== "" && <input type="hidden" name="fileSize" value={String(metaSize)} />}
      {url && (purpose === "image" || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) || metaType.startsWith("image/")) && (
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="mt-1 h-28 max-w-sm rounded-lg object-cover" />
          <MediaViewButton url={url} fileName={metaName || undefined} fileType={metaType || undefined} />
        </div>
      )}
      {url && (purpose === "proof" || metaType === "application/pdf" || /\.pdf(\?|$)/i.test(url)) &&
        !(metaType.startsWith("image/") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)) && (
        <MediaViewButton
          url={url}
          label="View file"
          fileName={metaName || "Uploaded file"}
          fileType={metaType || "application/pdf"}
        />
      )}
      {url && !metaType && !/\.(png|jpe?g|webp|gif|pdf)(\?|$)/i.test(url) && (
        <MediaViewButton url={url} label="View / open" fileName={metaName || undefined} />
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
