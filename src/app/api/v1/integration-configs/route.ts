import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { integrationConfigService } from "@/services/integration-config.service";

const setSchema = z.object({ key: z.string().min(1).max(100), value: z.string().max(5000) });
const clearSchema = z.object({ key: z.string().min(1).max(100) });

async function requireAdmin() {
  const user = await getApiUser();
  if (!user) return { error: apiError("Unauthorized", 401) };
  if (user.role.key !== "ADMIN") return { error: apiError("Forbidden", 403) };
  return { user };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return apiSuccess(await integrationConfigService.listForAdmin());
}

/** Save (create or replace) one value. The response never contains the plaintext secret. */
export async function PUT(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  try {
    const { key, value } = setSchema.parse(await request.json());
    await integrationConfigService.set(key, value, user.email);
    return apiSuccess(await integrationConfigService.listForAdmin());
  } catch (err) {
    return handleApiError(err);
  }
}

/** Remove the database value for one key (an env var of the same name, if set, still applies). */
export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const { key } = clearSchema.parse(await request.json());
    await integrationConfigService.clear(key);
    return apiSuccess(await integrationConfigService.listForAdmin());
  } catch (err) {
    return handleApiError(err);
  }
}
