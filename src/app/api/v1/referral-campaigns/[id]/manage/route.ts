import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import {
  campaignAssetSchema,
  campaignFaqSchema,
  campaignTermsSchema,
  enrollReferralSchema,
} from "@/lib/validation";
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
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "clone") {
      return apiSuccess(await campaignManagementService.cloneCampaign(id, user.id), 201);
    }
    if (action === "publish-feed") {
      return apiSuccess(await campaignManagementService.publishAsFeed(id, user.id), 201);
    }
    if (action === "status") {
      return apiSuccess(
        await campaignManagementService.setStatus(id, body.status, user.id),
      );
    }
    if (action === "asset") {
      const values = campaignAssetSchema.parse(body);
      return apiSuccess(await campaignManagementService.addAsset(id, values, user.id), 201);
    }
    if (action === "delete-asset") {
      const assetId = String(body.assetId || "");
      if (!assetId) return apiError("assetId is required", 422);
      return apiSuccess(await campaignManagementService.deleteAsset(id, assetId, user.id));
    }
    if (action === "terms") {
      const values = campaignTermsSchema.parse(body);
      return apiSuccess(await campaignManagementService.upsertTerms(id, values, user.id));
    }
    if (action === "faq") {
      const values = campaignFaqSchema.parse(body);
      return apiSuccess(await campaignManagementService.addFaq(id, values, user.id), 201);
    }
    if (action === "enroll") {
      const values = enrollReferralSchema.parse({ ...body, campaignId: id });
      return apiSuccess(
        await campaignManagementService.enrollReferral(values.referralId, id, user.id),
        201,
      );
    }
    return apiError("Unknown action", 400);
  } catch (error) {
    return handleApiError(error);
  }
}
