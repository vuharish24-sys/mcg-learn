import { cookies } from "next/headers";
import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { advertisementService } from "@/services/advertisement.service";

const schema = z.object({
  ids: z.array(z.string().min(1)).max(100),
});

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { ids } = schema.parse(await request.json());
    const cookieStore = await cookies();
    const cookieName = "mcg_ad_impr";
    const seen = new Set(
      (cookieStore.get(cookieName)?.value ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
    const freshIds = [...new Set(ids)].filter((id) => !seen.has(id));
    if (freshIds.length === 0) {
      return apiSuccess({ recorded: 0 });
    }

    const result = await advertisementService.recordImpressions(freshIds);
    freshIds.forEach((id) => seen.add(id));
    cookieStore.set(cookieName, [...seen].slice(-200).join(","), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
