import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classSessionCreateSchema } from "@/lib/validation";
import { trainerService } from "@/services/trainer.service";
import { trainerProgramService } from "@/services/trainer-program.service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const trainer = await trainerService.findByUserId(user.id);
    if (!trainer) return apiError("No trainer profile found for this account", 403);

    const { attendeeEmails, ...rest } = classSessionCreateSchema.parse(await request.json());
    const students = await prisma.user.findMany({ where: { email: { in: attendeeEmails } }, select: { id: true, email: true } });
    const foundEmails = new Set(students.map((s) => s.email));
    const missing = attendeeEmails.filter((email) => !foundEmails.has(email));
    if (missing.length > 0) return apiError(`No account found for: ${missing.join(", ")}`, 400);

    const session = await trainerProgramService.logClassSession(trainer.id, {
      ...rest,
      attendeeStudentIds: students.map((s) => s.id),
    });
    return apiSuccess(session, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
