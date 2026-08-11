import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { partnerCandidateEnrollSchema } from "@/lib/validation";
import { partnerCandidateService } from "@/services/partner-candidate.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const { enrolled } = partnerCandidateEnrollSchema.parse(await request.json());
    const candidate = await partnerCandidateService.setEnrolled(id, enrolled);
    return apiSuccess(candidate);
  } catch (error) {
    return handleApiError(error);
  }
}
