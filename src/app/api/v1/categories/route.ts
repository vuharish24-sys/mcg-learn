import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
});

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  return apiSuccess(await prisma.feedCategory.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const values = schema.parse(await request.json());
    const slug = values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return apiSuccess(await prisma.feedCategory.create({ data: { ...values, slug } }), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
