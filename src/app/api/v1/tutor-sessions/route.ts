import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { tutorSessionRequestSchema } from "@/lib/validation";
import { tutorSessionService } from "@/services/tutor-session.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const values = tutorSessionRequestSchema.parse(await request.json());
    const session = await tutorSessionService.createRequest(user.id, values);
    return apiSuccess(session, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
