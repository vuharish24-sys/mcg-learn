import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { paymentAttachmentSchema } from "@/lib/validation";
import { campaignManagementService } from "@/services/campaign-management.service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = paymentAttachmentSchema.parse(await request.json());
    return apiSuccess(await campaignManagementService.addPaymentProof(id, values, user.id), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
