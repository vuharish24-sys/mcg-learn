import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { joinReferralProgramSchema } from "@/lib/validation";
import { referralProfileService } from "@/services/referral-profile.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  const profile = await referralProfileService.getByUserId(user.id);
  return apiSuccess({
    joined: !!profile,
    eligible: await referralProfileService.isEligible(user.id),
    profile,
  });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const values = joinReferralProgramSchema.parse(await request.json());
    const profile = await referralProfileService.join(user.id, values);
    return apiSuccess(profile, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
