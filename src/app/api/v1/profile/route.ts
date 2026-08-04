import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/profile";
import { getProfileCompleteness, profileService } from "@/services/profile.service";

export async function GET() {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const profile = await profileService.getById(user.id);
    if (!profile) return apiError("Profile not found", 404);
    return apiSuccess({
      ...profile,
      completeness: getProfileCompleteness(profile),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const values = profileUpdateSchema.parse(await request.json());
    const profile = await profileService.update(user.id, values);
    return apiSuccess({
      ...profile,
      completeness: getProfileCompleteness(profile),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
