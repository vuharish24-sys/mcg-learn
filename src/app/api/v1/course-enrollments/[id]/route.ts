import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { courseEnrollmentService } from "@/services/course-enrollment.service";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    await courseEnrollmentService.unenroll(id);
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
