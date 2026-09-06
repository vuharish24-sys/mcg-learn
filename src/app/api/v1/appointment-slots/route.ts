import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { appointmentSlotCreateSchema } from "@/lib/validation";
import { appointmentService } from "@/services/appointment.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const values = appointmentSlotCreateSchema.parse(await request.json());
    const slot = await appointmentService.createSlot(
      { id: user.id, roleKey: user.role.key },
      values,
    );
    return apiSuccess(slot, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
