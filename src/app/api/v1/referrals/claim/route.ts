import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralService } from "@/services/referral.service";

const schema = z.object({
  code: z.string().trim().min(3).max(40),
});

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { code } = schema.parse(await request.json());
    const result = await referralService.attachReferredUser(code, user.id, user.email);
    if (!result.ok) {
      if (result.reason === "invalid") return apiError("Invalid referral code", 422);
      if (result.reason === "self_referral") {
        return apiError("You cannot claim your own referral code", 422);
      }
      return apiError("Referral code has already been claimed", 409);
    }
    return apiSuccess(result.referral);
  } catch (error) {
    return handleApiError(error);
  }
}
