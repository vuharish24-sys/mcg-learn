import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { leadNoteSchema } from "@/lib/validation";
import { crmService } from "@/services/crm.service";

const allowedRoles = ["ADMIN", "CAREER_OFFICER"];

async function assertLeadAccess(userId: string, roleKey: string, leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { error: apiError("Lead not found", 404) as Response };
  if (roleKey === "CAREER_OFFICER" && lead.assignedOfficerId !== userId) {
    return { error: apiError("Forbidden", 403) as Response };
  }
  return { lead };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!allowedRoles.includes(user.role.key)) return apiError("Forbidden", 403);

  const { id } = await params;
  const access = await assertLeadAccess(user.id, user.role.key, id);
  if (access.error) return access.error;

  const notes = await prisma.leadNote.findMany({
    where: { leadId: id },
    include: { author: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return apiSuccess(notes);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!allowedRoles.includes(user.role.key)) return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const access = await assertLeadAccess(user.id, user.role.key, id);
    if (access.error) return access.error;
    const values = leadNoteSchema.parse(await request.json());
    return apiSuccess(await crmService.createNote(id, user.id, values.body), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
