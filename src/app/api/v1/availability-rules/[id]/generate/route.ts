import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { availabilityRuleGenerateSchema } from "@/lib/validation";
import { appointmentService } from "@/services/appointment.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const values = availabilityRuleGenerateSchema.parse(await request.json().catch(() => ({})));
    const createdCount = await appointmentService.generateSlotsFromRule(user.id, id, values.weeksAhead);
    return apiSuccess({ createdCount });
  } catch (error) {
    return handleApiError(error);
  }
}
