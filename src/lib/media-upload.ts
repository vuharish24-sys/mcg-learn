import { randomBytes } from "crypto";
import { AppValidationError } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const MEDIA_BUCKET = "learning-content";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_PROOF_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
]);

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export type MediaFolder =
  | "referral-campaigns"
  | "referral-payments"
  | "feed"
  | "general";

function extensionFor(mime: string, originalName: string) {
  const fromName = originalName.includes(".")
    ? originalName.split(".").pop()?.toLowerCase()
    : null;
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "application/pdf") return "pdf";
  return "jpg";
}

export async function uploadMediaFile(input: {
  file: File;
  folder: MediaFolder;
  purpose?: "image" | "proof";
}) {
  const purpose = input.purpose ?? "image";
  const allowed = purpose === "proof" ? ALLOWED_PROOF_TYPES : ALLOWED_IMAGE_TYPES;
  if (!allowed.has(input.file.type)) {
    throw new AppValidationError(
      purpose === "proof"
        ? "Only JPG, PNG, WEBP, GIF, or PDF files are allowed"
        : "Only JPG, PNG, WEBP, or GIF images are allowed",
    );
  }
  if (input.file.size <= 0 || input.file.size > MAX_BYTES) {
    throw new AppValidationError("File must be between 1 byte and 8 MB");
  }

  const ext = extensionFor(input.file.type, input.file.name);
  const path = `${input.folder}/${new Date().toISOString().slice(0, 10)}/${randomBytes(8).toString("hex")}.${ext}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, buffer, {
    contentType: input.file.type,
    upsert: false,
  });
  if (error) {
    throw new AppValidationError(error.message || "Upload failed");
  }

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return {
    fileUrl: data.publicUrl,
    fileName: input.file.name,
    fileType: input.file.type,
    fileSize: input.file.size,
    storagePath: path,
  };
}

/** Best-effort remove from Supabase Storage when the URL points at our public bucket. */
export async function removeMediaFile(fileUrl: string) {
  try {
    const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
    const index = fileUrl.indexOf(marker);
    if (index === -1) return { removed: false, reason: "external-url" as const };

    const path = decodeURIComponent(fileUrl.slice(index + marker.length).split("?")[0] ?? "");
    if (!path) return { removed: false, reason: "invalid-path" as const };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    if (error) {
      return { removed: false, reason: error.message };
    }
    return { removed: true, path };
  } catch (error) {
    return {
      removed: false,
      reason: error instanceof Error ? error.message : "remove-failed",
    };
  }
}
