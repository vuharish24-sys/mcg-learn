import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { contentSourceService } from "@/services/content-source.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    return apiSuccess(await contentSourceService.listNewItems());
  } catch (error) {
    return handleApiError(error);
  }
}
