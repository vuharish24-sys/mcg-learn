import { apiError, apiSuccess } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { isValidCronSecret } from "@/lib/cron-auth";
import { feedService } from "@/services/feed.service";

/** Cron/manual job endpoint: publishes DRAFT feed items whose scheduled publishedAt has arrived. */
export async function POST(request: Request) {
  if (!isValidCronSecret(request)) {
    const user = await getApiUser();
    if (!user) return apiError("Unauthorized", 401);
    if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  }
  return apiSuccess(await feedService.publishScheduled());
}
