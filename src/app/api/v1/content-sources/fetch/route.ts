import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { contentSourceService } from "@/services/content-source.service";

/** Admin clicks "Fetch latest" — polls every active source and stages new items for review. */
export async function POST() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const results = await contentSourceService.fetchLatestForAllActive();
    return apiSuccess(results);
  } catch (error) {
    return handleApiError(error);
  }
}
