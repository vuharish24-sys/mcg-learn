"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function isImageUrl(url: string, fileType?: string | null) {
  if (fileType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}

function isPdfUrl(url: string, fileType?: string | null) {
  if (fileType === "application/pdf") return true;
  return /\.pdf(\?|$)/i.test(url);
}

export function MediaViewButton({
  url,
  label = "View",
  fileName,
  fileType,
  size = "sm",
}: {
  url: string;
  label?: string;
  fileName?: string | null;
  fileType?: string | null;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const image = isImageUrl(url, fileType);
  const pdf = isPdfUrl(url, fileType);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => {
          if (image || pdf) setOpen(true);
          else window.open(url, "_blank", "noopener,noreferrer");
        }}
      >
        <Eye className="size-3.5" />
        {label}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={fileName || "Media preview"}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3 dark:border-slate-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{fileName || "Uploaded media"}</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 underline"
                >
                  Open in new tab <ExternalLink className="size-3" />
                </a>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="max-h-[calc(90vh-4rem)] overflow-auto bg-slate-50 p-4 dark:bg-slate-950">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={fileName || "Uploaded media"} className="mx-auto max-h-[75vh] w-auto max-w-full object-contain" />
              ) : pdf ? (
                <iframe title={fileName || "PDF"} src={url} className="h-[75vh] w-full rounded-lg border dark:border-slate-800" />
              ) : (
                <p className="text-sm text-slate-500">Preview not available for this file type.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
