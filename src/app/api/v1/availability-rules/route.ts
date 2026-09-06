import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { availabilityRuleCreateSchema } from "@/lib/validation";
import { appointmentService } from "@/services/appointment.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const values = availabilityRuleCreateSchema.parse(await request.json());
    const result = await appointmentService.createAvailabilityRule(
      { id: user.id, roleKey: user.role.key },
      values,
    );
    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
