import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { learningPathSchema } from "@/lib/validation";
import { learningPathService } from "@/services/learning-path.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getApiUser();
  const path = await learningPathService.findByIdOrSlug(id);
  if (!path) return apiError("Learning path not found", 404);

  const isAdmin = user?.role.key === "ADMIN";
  if (!isAdmin && (path.status !== "PUBLISHED" || path.visibility !== "PUBLIC")) {
    return apiError("Learning path not found", 404);
  }

  if (user) {
    const withProgress = await learningPathService.getPathWithUserProgress(path.id, user.id);
    return apiSuccess(withProgress);
  }

  return apiSuccess({ path, progress: null, itemsWithStatus: path.items.map((item) => ({ ...item, isComplete: false, bestScore: null, manuallyCompleted: false })) });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const existing = await learningPathService.findByIdOrSlug(id);
    if (!existing) return apiError("Learning path not found", 404);

    const values = learningPathSchema.partial().parse(await request.json());
    return apiSuccess(await learningPathService.update(existing.id, values));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  const { id } = await params;
  const existing = await learningPathService.findByIdOrSlug(id);
  if (!existing) return apiError("Learning path not found", 404);

  await learningPathService.delete(existing.id);
  return apiSuccess({ deleted: true });
}
