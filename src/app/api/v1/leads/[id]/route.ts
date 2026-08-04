import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crmService } from "@/services/crm.service";

const updateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "ADMITTED", "CLOSED"]).optional(),
  assignedOfficerId: z.string().uuid().nullable().optional(),
  followUpAt: z.coerce.date().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "No updates supplied");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "CAREER_OFFICER"].includes(user.role.key)) return apiError("Forbidden", 403);
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { assignedOfficer: true, notes: { include: { author: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!lead) return apiError("Lead not found", 404);
  if (user.role.key === "CAREER_OFFICER" && lead.assignedOfficerId !== user.id) return apiError("Forbidden", 403);
  return apiSuccess(lead);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "CAREER_OFFICER"].includes(user.role.key)) return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return apiError("Lead not found", 404);
    if (user.role.key === "CAREER_OFFICER" && existing.assignedOfficerId !== user.id) return apiError("Forbidden", 403);
    const values = updateSchema.parse(await request.json());
    if (user.role.key !== "ADMIN") delete values.assignedOfficerId;
    return apiSuccess(await crmService.update(id, values));
  } catch (error) {
    return handleApiError(error);
  }
}
