import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { courseEnrollmentCreateSchema } from "@/lib/validation";
import { courseEnrollmentService } from "@/services/course-enrollment.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { userEmail, feedItemId } = courseEnrollmentCreateSchema.parse(await request.json());
    const enrollment = await courseEnrollmentService.enroll(userEmail, feedItemId);
    return apiSuccess(enrollment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
