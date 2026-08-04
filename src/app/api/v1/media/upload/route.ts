import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { uploadMediaFile, type MediaFolder } from "@/lib/media-upload";

const FOLDERS = new Set<MediaFolder>([
  "referral-campaigns",
  "referral-payments",
  "feed",
  "general",
]);

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "CAREER_OFFICER"].includes(user.role.key)) {
    return apiError("Forbidden", 403);
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return apiError("Choose a file to upload", 422);
    }

    const folderRaw = String(form.get("folder") || "general");
    const folder = (FOLDERS.has(folderRaw as MediaFolder) ? folderRaw : "general") as MediaFolder;
    const purpose = String(form.get("purpose") || "image") === "proof" ? "proof" : "image";

    const uploaded = await uploadMediaFile({ file, folder, purpose });
    return apiSuccess(uploaded, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
