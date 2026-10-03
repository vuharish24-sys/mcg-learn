import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { couponSchema } from "@/lib/validation";
import { couponService } from "@/services/coupon.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  return apiSuccess(await couponService.list());
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);
  try {
    const values = couponSchema.parse(await request.json());
    return apiSuccess(await couponService.create(values), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
