import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { learningPathService } from "@/services/learning-path.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const path = await learningPathService.findByIdOrSlug(id);
    if (!path) return apiError("Learning path not found", 404);

    const body = (await request.json()) as { feedItemId?: string };
    if (!body.feedItemId) return apiError("feedItemId is required", 400);

    const result = await learningPathService.markItemComplete(user.id, path.id, body.feedItemId);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
