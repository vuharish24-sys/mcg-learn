import { Prisma } from "@prisma/client";
import { getApiUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { feedItemSchema } from "@/lib/validation";
import { feedService } from "@/services/feed.service";
import { extractVariantBenefits } from "@/lib/feed-actions";
import { benefitService } from "@/services/benefit.service";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const items = await feedService.list({
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    sort: searchParams.get("sort") === "popular" ? "popular" : "latest",
    featured: searchParams.get("featured") === "true",
    includeDrafts: user.role.key === "ADMIN" && searchParams.get("admin") === "true",
  });
  return apiSuccess(items);
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = feedItemSchema.parse(await request.json());
    let content: Prisma.InputJsonValue | undefined;
    if (typeof values.content === "string" && values.content.trim()) {
      try {
        content = JSON.parse(values.content) as Prisma.InputJsonValue;
      } catch {
        return apiError("Content JSON is invalid", 422);
      }
    } else if (values.content && typeof values.content === "object") {
      content = values.content as Prisma.InputJsonValue;
    }

    let variantBenefits: { variantId: string; benefitIds: string[] }[] = [];
    if (values.type === "COURSE" && content !== undefined) {
      const extracted = extractVariantBenefits(content);
      content = extracted.content as Prisma.InputJsonValue;
      variantBenefits = extracted.variantBenefits;
    }

    const item = await feedService.create({
      title: values.title,
      description: values.description,
      categoryId: values.categoryId,
      type: values.type,
      status: values.status,
      priority: values.priority,
      isFeatured: values.isFeatured,
      thumbnailUrl: values.thumbnailUrl || null,
      externalUrl: values.externalUrl || null,
      placements: values.placements,
      postedByPartnerId: values.postedByPartnerId || null,
      ...(content !== undefined ? { content } : {}),
      publishedAt:
        values.status === "PUBLISHED"
          ? (values.publishedAt ?? new Date())
          : values.publishedAt,
    });

    if (values.type === "COURSE") {
      await benefitService.syncVariantBenefits(item.id, variantBenefits);
    }

    return apiSuccess(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
