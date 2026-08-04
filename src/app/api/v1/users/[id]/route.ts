import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "No updates supplied");

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const values = schema.parse(await request.json());
    if (id === user.id && values.isActive === false) {
      return apiError("You cannot deactivate your own account", 422);
    }
    const updated = await prisma.user.update({
      where: { id },
      data: values,
      include: { role: true },
    });
    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
