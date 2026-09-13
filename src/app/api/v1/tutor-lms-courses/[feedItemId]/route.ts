import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { tutorLmsCourseMappingSchema } from "@/lib/validation";
import { tutorLmsService } from "@/services/tutor-lms.service";

type Params = { params: Promise<{ feedItemId: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { feedItemId } = await params;
    const values = tutorLmsCourseMappingSchema.parse(await request.json());
    const mapping = await tutorLmsService.upsertMapping(feedItemId, values);
    return apiSuccess(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}
