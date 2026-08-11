import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { partnerUpdateSchema } from "@/lib/validation";
import { partnerService } from "@/services/partner.service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const body = await request.json();

    if (body?.regenerateAccessCode === true) {
      const partner = await partnerService.regenerateAccessCode(id);
      return apiSuccess(partner);
    }

    if (body?.regenerateManagementCode === true) {
      const partner = await partnerService.regenerateManagementCode(id);
      return apiSuccess(partner);
    }

    const values = partnerUpdateSchema.parse(body);
    const partner = await partnerService.update(id, {
      ...values,
      logoUrl: values.logoUrl === undefined ? undefined : values.logoUrl || null,
      contactName: values.contactName === undefined ? undefined : values.contactName || null,
      contactEmail: values.contactEmail === undefined ? undefined : values.contactEmail || null,
    });
    return apiSuccess(partner);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    await partnerService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
