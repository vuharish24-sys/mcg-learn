import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { contentSourceImportSchema } from "@/lib/validation";
import { contentSourceService } from "@/services/content-source.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = contentSourceImportSchema.parse(await request.json());
    const feedItem =
      values.target === "LEARNING_PATH"
        ? await contentSourceService.importToLearningPath(id, values.categoryId, values.learningPathId as string)
        : await contentSourceService.importToFeed(id, values.categoryId);
    return apiSuccess({ feedItem }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
