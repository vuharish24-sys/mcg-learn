import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { certificateSchema } from "@/lib/validation";
import { certificateService } from "@/services/certificate.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "LEARNER"].includes(user.role.key)) {
    return apiError("Forbidden", 403);
  }
  const certificates = await certificateService.list(
    user.role.key === "LEARNER" ? user.id : undefined,
  );
  return apiSuccess(certificates);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = certificateSchema.parse(await request.json());
    return apiSuccess(await certificateService.create(values), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
