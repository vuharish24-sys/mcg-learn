import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { appointmentService } from "@/services/appointment.service";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    await appointmentService.deleteAvailabilityRule(user.id, id);
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
