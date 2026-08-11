import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { partnerCreateSchema } from "@/lib/validation";
import { partnerService } from "@/services/partner.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  return apiSuccess(await partnerService.list());
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = partnerCreateSchema.parse(await request.json());
    const partner = await partnerService.create({
      ...values,
      logoUrl: values.logoUrl || null,
      contactName: values.contactName || null,
      contactEmail: values.contactEmail || null,
    });
    return apiSuccess(partner, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
