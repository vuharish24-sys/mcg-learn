import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { moodleCourseMappingSchema } from "@/lib/validation";
import { moodleCourseService } from "@/services/moodle-course.service";

type Params = { params: Promise<{ feedItemId: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { feedItemId } = await params;
    const values = moodleCourseMappingSchema.parse(await request.json());
    const mapping = await moodleCourseService.upsertMapping(feedItemId, values);
    return apiSuccess(mapping, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
