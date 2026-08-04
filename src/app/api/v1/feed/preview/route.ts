import { z } from "zod";
import { getApiUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { fetchLinkPreview } from "@/lib/link-preview";
import { feedService } from "@/services/feed.service";

const previewSchema = z.object({
  url: z.url(),
  feedItemId: z.string().optional(),
});

/** Preview a URL (admin) and optionally refresh a feed item's cached preview. */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = previewSchema.parse(await request.json());
    const preview = await fetchLinkPreview(values.url);

    if (values.feedItemId) {
      const updated = await feedService.refreshPreview(values.feedItemId);
      if (!updated) return apiError("Feed item not found", 404);
      return apiSuccess({ preview, item: updated });
    }

    return apiSuccess({ preview });
  } catch (error) {
    return handleApiError(error);
  }
}
