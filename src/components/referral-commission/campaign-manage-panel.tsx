"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";
import { MediaUploadField } from "@/components/media/media-upload-field";
import { REFERRAL_CAMPAIGN_ASSET_TYPES } from "@/lib/referral-commission";
import { enumLabel } from "@/lib/utils";

export function CampaignManagePanel({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const assetFormRef = useRef<HTMLFormElement>(null);
  const faqFormRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadedName, setUploadedName] = useState("");
  const [assetFormKey, setAssetFormKey] = useState(0);

  async function run(action: string, body: Record<string, unknown> = {}, options?: { refresh?: boolean }) {
    setMessage("");
    setError("");
    const response = await fetch(`/api/v1/referral-campaigns/${campaignId}/manage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error?.message ?? "Action failed");
      return false;
    }
    setMessage(`${action} succeeded`);
    if (options?.refresh !== false) router.refresh();
    return true;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => run("clone")}>Clone</Button>
        <Button type="button" variant="secondary" onClick={() => run("status", { status: "ACTIVE" })}>Activate</Button>
        <Button type="button" variant="secondary" onClick={() => run("status", { status: "PAUSED" })}>Deactivate</Button>
        <Button type="button" variant="secondary" onClick={() => run("status", { status: "ARCHIVED" })}>Archive</Button>
        <Button type="button" onClick={() => run("publish-feed")}>Publish as Feed</Button>
      </div>

      <form
        key={assetFormKey}
        ref={assetFormRef}
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const formEl = assetFormRef.current;
          if (!formEl) return;
          const form = new FormData(formEl);
          const fileUrl = String(form.get("fileUrl") || "");
          if (!fileUrl) {
            setError("Upload a file or paste an image URL");
            return;
          }
          const ok = await run(
            "asset",
            {
              assetType: form.get("assetType"),
              fileName: form.get("fileName") || uploadedName || "campaign-asset",
              fileUrl,
              fileType: form.get("fileType") || null,
              fileSize: form.get("fileSize") ? Number(form.get("fileSize")) : null,
            },
            { refresh: false },
          );
          if (!ok) return;
          setUploadedName("");
          setAssetFormKey((value) => value + 1);
          router.refresh();
        }}
      >
        <p className="sm:col-span-2 text-sm font-semibold">Campaign banner / asset</p>
        <select name="assetType" className={fieldClassName} required defaultValue="BANNER">
          {REFERRAL_CAMPAIGN_ASSET_TYPES.map((type) => (
            <option key={type} value={type}>{enumLabel(type)}</option>
          ))}
        </select>
        <Input
          name="fileName"
          placeholder="Display file name (optional if uploading)"
          defaultValue={uploadedName}
        />
        <MediaUploadField
          name="fileUrl"
          label="Banner / image"
          folder="referral-campaigns"
          required
          onUploaded={(media) => setUploadedName(media.fileName)}
        />
        <Button type="submit">Save asset</Button>
      </form>

      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const formEl = event.currentTarget;
          const form = new FormData(formEl);
          await run("terms", {
            version: form.get("version"),
            content: form.get("content"),
            effectiveDate: form.get("effectiveDate"),
            isCurrent: true,
          });
        }}
      >
        <p className="text-sm font-semibold">Campaign terms</p>
        <Input name="version" placeholder="CT-2026-01" required />
        <Input name="effectiveDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        <Textarea name="content" required placeholder="Campaign-specific terms..." />
        <Button type="submit">Save terms</Button>
      </form>

      <form
        ref={faqFormRef}
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const formEl = faqFormRef.current;
          if (!formEl) return;
          const form = new FormData(formEl);
          const ok = await run(
            "faq",
            {
              question: form.get("question"),
              answer: form.get("answer"),
              sortOrder: Number(form.get("sortOrder") || 0),
              isActive: true,
            },
            { refresh: false },
          );
          if (!ok) return;
          formEl.reset();
          router.refresh();
        }}
      >
        <p className="text-sm font-semibold">Add FAQ</p>
        <Input name="question" required placeholder="Question" />
        <Textarea name="answer" required placeholder="Answer" />
        <Input name="sortOrder" type="number" defaultValue={0} />
        <Button type="submit">Add FAQ</Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-teal-700">{message}</p>}
    </div>
  );
}
