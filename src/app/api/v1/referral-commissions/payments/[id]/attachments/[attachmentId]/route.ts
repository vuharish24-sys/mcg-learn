import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { campaignManagementService } from "@/services/campaign-management.service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { attachmentId } = await params;
    return apiSuccess(
      await campaignManagementService.deletePaymentAttachment(attachmentId, user.id),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
