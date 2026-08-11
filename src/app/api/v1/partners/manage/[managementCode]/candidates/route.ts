import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { partnerCandidateCreateSchema } from "@/lib/validation";
import { partnerService } from "@/services/partner.service";
import { partnerCandidateService } from "@/services/partner-candidate.service";

type Params = { params: Promise<{ managementCode: string }> };

/**
 * Public — deliberately no auth check. This is the partner's own private
 * management link (distinct from the student-facing accessCode link), used
 * by their staff to add candidates to the board allowlist.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { managementCode } = await params;
    const partner = await partnerService.getByManagementCode(managementCode);
    if (!partner) return apiError("Management link not recognized", 404);

    const values = partnerCandidateCreateSchema.parse(await request.json());
    const candidate = await partnerCandidateService.addCandidate(partner.id, {
      fullName: values.fullName,
      email: values.email || undefined,
      phone: values.phone,
    });
    return apiSuccess(candidate, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
