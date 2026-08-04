import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { extendMilestoneSchema } from "@/lib/validation";
import { campaignManagementService } from "@/services/campaign-management.service";
import { z } from "zod";

const achieveSchema = z.object({
  paymentBasisAmount: z.coerce.number().min(0).max(10_000_000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "CAREER_OFFICER"].includes(user.role.key)) return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const body = await request.json();
    const action = String(body.action || "achieve");

    if (action === "extend") {
      const values = extendMilestoneSchema.parse(body);
      return apiSuccess(await campaignManagementService.extendMilestone(id, values, user.id));
    }
    if (action === "expire-job") {
      return apiSuccess(await campaignManagementService.expireDueMilestones());
    }
    const values = achieveSchema.parse(body);
    return apiSuccess(
      await campaignManagementService.achieveMilestone(id, user.id, values.paymentBasisAmount),
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
