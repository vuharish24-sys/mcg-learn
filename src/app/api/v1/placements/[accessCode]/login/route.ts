import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { partnerCandidateLoginSchema } from "@/lib/validation";
import { partnerService, isPartnerAccessOpen } from "@/services/partner.service";
import { partnerCandidateService, isCandidateAccessValid } from "@/services/partner-candidate.service";
import { partnerCandidateCookieName, PARTNER_CANDIDATE_COOKIE_MAX_AGE } from "@/lib/partner-candidate-session";

type Params = { params: Promise<{ accessCode: string }> };

/**
 * Public — deliberately no auth check. Verifies the visitor's email/phone
 * against the partner's PartnerCandidate allowlist and, on a match, sets a
 * per-partner session cookie so /placements and /jobs can recognize them on
 * later visits without asking again.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { accessCode } = await params;
    const partner = await partnerService.getByAccessCode(accessCode);
    if (!partner || !isPartnerAccessOpen(partner)) {
      return apiError("This link is not currently active", 404);
    }

    const { identifier } = partnerCandidateLoginSchema.parse(await request.json());
    const candidate = await partnerCandidateService.login(partner.id, identifier);
    if (!candidate) {
      return apiError(
        "We couldn't find that email or phone on your institute's list. Ask them to add you first.",
        404,
      );
    }

    const response = apiSuccess({ valid: isCandidateAccessValid(candidate) });
    response.cookies.set(partnerCandidateCookieName(partner.id), candidate.sessionToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PARTNER_CANDIDATE_COOKIE_MAX_AGE,
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
