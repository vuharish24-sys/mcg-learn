import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { leadSchema } from "@/lib/validation";
import { crmService } from "@/services/crm.service";

const allowedRoles = ["ADMIN", "CAREER_OFFICER"];

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!allowedRoles.includes(user.role.key)) return apiError("Forbidden", 403);

  const { searchParams } = new URL(request.url);
  const leads = await crmService.list(
    searchParams.get("search") ?? undefined,
    searchParams.get("status") ?? undefined,
    user.role.key === "CAREER_OFFICER" ? user.id : undefined,
  );
  return apiSuccess(leads);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!allowedRoles.includes(user.role.key)) return apiError("Forbidden", 403);

  try {
    const values = leadSchema.parse(await request.json());
    const lead = await crmService.create({
      ...values,
      email: values.email || null,
      assignedOfficerId:
        user.role.key === "CAREER_OFFICER" ? user.id : values.assignedOfficerId,
    });
    return apiSuccess(lead, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
