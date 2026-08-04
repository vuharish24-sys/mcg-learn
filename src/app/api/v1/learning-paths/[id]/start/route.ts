import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { learningPathService } from "@/services/learning-path.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const path = await learningPathService.findByIdOrSlug(id);
    if (!path) return apiError("Learning path not found", 404);
    if (path.status !== "PUBLISHED") return apiError("Learning path is not available", 400);

    const progress = await learningPathService.startPath(user.id, path.id);
    return apiSuccess(progress, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
