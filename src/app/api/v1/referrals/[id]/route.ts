import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { referralStatusSchema } from "@/lib/validation";
import { referralService } from "@/services/referral.service";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "CAREER_OFFICER"].includes(user.role.key)) {
    return apiError("Forbidden", 403);
  }

  try {
    const { id } = await params;
    const existing = await prisma.referral.findUnique({ where: { id } });
    if (!existing) return apiError("Referral not found", 404);
    if (user.role.key === "CAREER_OFFICER" && existing.referrerId !== user.id) {
      return apiError("Forbidden", 403);
    }
    const values = referralStatusSchema.parse(await request.json());
    return apiSuccess(await referralService.updateStatus(id, values.status));
  } catch (error) {
    return handleApiError(error);
  }
}
