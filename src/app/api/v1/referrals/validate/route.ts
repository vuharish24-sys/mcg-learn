import { apiError, apiSuccess } from "@/lib/api";
import { referralService } from "@/services/referral.service";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return apiError("Referral code is required", 422);

  const resolved = await referralService.resolveCode(code);
  if (!resolved) return apiError("Invalid referral code", 404);

  if (resolved.type === "partner") {
    return apiSuccess({
      code: resolved.profile.referralCode,
      status: resolved.profile.status,
      available: true,
      source: "partner",
    });
  }

  return apiSuccess({
    code: resolved.referral.code,
    status: resolved.referral.status,
    available: !resolved.referral.referredUserId,
    source: "invite",
  });
}
