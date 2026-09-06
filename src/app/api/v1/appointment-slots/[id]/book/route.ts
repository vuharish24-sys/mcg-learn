import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { appointmentBookSchema } from "@/lib/validation";
import { appointmentService } from "@/services/appointment.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const values = appointmentBookSchema.parse(await request.json().catch(() => ({})));
    const appointment = await appointmentService.book(user.id, id, values.learnerNotes);
    return apiSuccess(appointment, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
