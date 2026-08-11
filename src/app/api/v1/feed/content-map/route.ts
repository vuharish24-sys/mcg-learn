import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { generateContentMap } from "@/lib/ai-content";
import { contentMapSchema } from "@/lib/validation";

/**
 * Admin gives a master topic; AI plans a multi-asset content series (angle +
 * format per asset) without generating any content yet. The admin reviews and
 * adjusts this plan client-side, then POSTs the chosen angles to
 * /api/v1/feed/content-series to actually generate and save the drafts.
 */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = contentMapSchema.parse(await request.json());
    const angles = await generateContentMap(values.topic, values.count);
    return apiSuccess({ angles });
  } catch (error) {
    return handleApiError(error);
  }
}
