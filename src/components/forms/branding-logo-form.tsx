"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaUploadField } from "@/components/media/media-upload-field";
import { Button } from "@/components/ui/button";

const LOGO_SETTING_KEY = "branding.logo_url";

export function BrandingLogoForm({ initialLogoUrl }: { initialLogoUrl: string | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? "");

  async function save(value: string) {
    setSaving(true);
    setError("");
    const response = await fetch("/api/v1/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: LOGO_SETTING_KEY, value, isPublic: true }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save logo");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Shown in the navigation, the public landing page, and login/register screens. Leave empty
        to use the default icon.
      </p>
      <MediaUploadField
        name="logoUrl"
        label="Logo"
        folder="general"
        purpose="image"
        defaultUrl={logoUrl}
        onUploaded={(media) => {
          setLogoUrl(media.fileUrl);
          save(media.fileUrl);
        }}
      />
      {logoUrl && (
        <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => { setLogoUrl(""); save(""); }}>
          Remove logo, use default
        </Button>
      )}
      {saving && <p className="text-xs text-teal-700">Saving…</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
