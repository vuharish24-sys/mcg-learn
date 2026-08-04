import { timingSafeEqual } from "crypto";
import { apiError, apiSuccess } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { cronSecret } from "@/lib/env";
import { campaignManagementService } from "@/services/campaign-management.service";

function isValidCronSecret(request: Request) {
  const secret = cronSecret();
  if (!secret) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Cron/manual job endpoint to auto-expire due referral milestones. Callable by an admin session or the CRON_SECRET bearer token (scheduled job). */
export async function POST(request: Request) {
  if (!isValidCronSecret(request)) {
    const user = await getApiUser();
    if (!user) return apiError("Unauthorized", 401);
    if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  }
  return apiSuccess(await campaignManagementService.expireDueMilestones());
}
