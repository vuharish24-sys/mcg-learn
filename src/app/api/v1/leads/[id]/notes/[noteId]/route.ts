import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadNoteSchema } from "@/lib/validation";
import { crmService } from "@/services/crm.service";

const allowedRoles = ["ADMIN", "CAREER_OFFICER"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!allowedRoles.includes(user.role.key)) return apiError("Forbidden", 403);

  try {
    const { id, noteId } = await params;
    const note = await prisma.leadNote.findUnique({
      where: { id: noteId },
      include: { lead: true },
    });
    if (!note || note.leadId !== id) return apiError("Note not found", 404);
    if (
      user.role.key === "CAREER_OFFICER" &&
      note.lead.assignedOfficerId !== user.id
    ) {
      return apiError("Forbidden", 403);
    }
    if (user.role.key !== "ADMIN" && note.authorId !== user.id) {
      return apiError("Forbidden", 403);
    }

    const values = leadNoteSchema.parse(await request.json());
    return apiSuccess(await crmService.updateNote(noteId, values.body));
  } catch (error) {
    return handleApiError(error);
  }
}
