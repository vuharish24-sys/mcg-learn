import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  key: z.string().trim().regex(/^[a-z0-9._-]+$/).max(100),
  value: z.string().max(5000),
  isPublic: z.coerce.boolean().default(false),
});

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  const settings = await prisma.setting.findMany({
    where: user.role.key === "ADMIN" ? undefined : { isPublic: true },
    orderBy: { key: "asc" },
  });
  return apiSuccess(settings);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const values = schema.parse(await request.json());
    const setting = await prisma.setting.upsert({
      where: { key: values.key },
      update: { value: values.value, isPublic: values.isPublic },
      create: { key: values.key, value: values.value, isPublic: values.isPublic },
    });
    return apiSuccess(setting, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
