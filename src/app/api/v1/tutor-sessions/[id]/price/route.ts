import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { tutorSessionPriceSchema } from "@/lib/validation";
import { tutorSessionService } from "@/services/tutor-session.service";
import { trainerService } from "@/services/trainer.service";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    if (user.role.key !== "ADMIN") {
      const trainer = await trainerService.findByUserId(user.id);
      const target = await prisma.tutorSessionRequest.findUnique({ where: { id }, select: { trainerId: true } });
      if (!trainer || !target || target.trainerId !== trainer.id) return apiError("Forbidden", 403);
    }

    const values = tutorSessionPriceSchema.parse(await request.json());
    const session = await tutorSessionService.setPrice(id, values.priceAmountPaise);
    return apiSuccess(session);
  } catch (error) {
    return handleApiError(error);
  }
}
