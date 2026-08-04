import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralSchema } from "@/lib/validation";
import { referralProfileService } from "@/services/referral-profile.service";
import { referralService } from "@/services/referral.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  const isAdmin = user.role.key === "ADMIN";
  if (!isAdmin) {
    try {
      await referralProfileService.requireEligible(user.id);
    } catch (error) {
      return handleApiError(error);
    }
  }

  const referrals = await referralService.list(isAdmin ? undefined : user.id);
  return apiSuccess(referrals);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    await referralProfileService.requireEligible(user.id);
    const values = referralSchema.parse(await request.json());
    return apiSuccess(await referralService.create(user.id, values), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
