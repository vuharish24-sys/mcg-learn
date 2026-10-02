import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { integrationConfigService } from "@/services/integration-config.service";

const schema = z.object({ group: z.enum(["practiceLab", "razorpay", "wordpress", "email", "whatsapp"]) });

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const { group } = schema.parse(await request.json());
    return apiSuccess(await integrationConfigService.testConnection(group));
  } catch (error) {
    return handleApiError(error);
  }
}
