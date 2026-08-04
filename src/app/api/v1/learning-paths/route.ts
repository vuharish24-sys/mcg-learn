import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { learningPathSchema } from "@/lib/validation";
import { learningPathService } from "@/services/learning-path.service";

export async function GET(request: Request) {
  const user = await getApiUser();
  const { searchParams } = new URL(request.url);
  const isAdmin = user?.role.key === "ADMIN";

  if (!user) {
    const paths = await learningPathService.list({ status: "PUBLISHED", visibility: "PUBLIC" });
    return apiSuccess(paths);
  }

  const filters: { status?: string; visibility?: string; featured?: boolean } = {};
  if (!isAdmin) {
    filters.status = "PUBLISHED";
    filters.visibility = "PUBLIC";
  } else {
    const status = searchParams.get("status");
    const visibility = searchParams.get("visibility");
    if (status) filters.status = status;
    if (visibility) filters.visibility = visibility;
  }
  if (searchParams.get("featured") === "true") filters.featured = true;

  return apiSuccess(await learningPathService.list(filters));
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = learningPathSchema.parse(await request.json());
    return apiSuccess(await learningPathService.create(values), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
