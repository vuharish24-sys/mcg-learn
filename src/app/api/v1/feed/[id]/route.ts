import { Prisma } from "@prisma/client";
import { getApiUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { feedItemSchema } from "@/lib/validation";
import { feedService } from "@/services/feed.service";
import { extractVariantBenefits } from "@/lib/feed-actions";
import { benefitService } from "@/services/benefit.service";

type Params = { params: Promise<{ id: string }> };

function parseContent(values: { content?: string | Record<string, unknown> | null }) {
  if (typeof values.content === "string" && values.content.trim()) {
    try {
      return JSON.parse(values.content) as Prisma.InputJsonValue;
    } catch {
      throw Object.assign(new Error("Content JSON is invalid"), { status: 422 });
    }
  }
  if (values.content && typeof values.content === "object") {
    return values.content as Prisma.InputJsonValue;
  }
  if (values.content === null) return Prisma.JsonNull;
  return undefined;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const item = await feedService.findById(id);
  if (!item) return apiError("Feed item not found", 404);
  if (user.role.key !== "ADMIN" && item.status !== "PUBLISHED") {
    return apiError("Feed item not found", 404);
  }

  return apiSuccess(item);
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const { id } = await params;
    const existing = await feedService.findById(id);
    if (!existing) return apiError("Feed item not found", 404);

    const values = feedItemSchema.partial().parse(await request.json());
    let content: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
    try {
      content = parseContent(values);
    } catch {
      return apiError("Content JSON is invalid", 422);
    }

    const effectiveType = values.type ?? existing.type;
    let variantBenefits: { variantId: string; benefitIds: string[] }[] = [];
    if (effectiveType === "COURSE" && content !== undefined && content !== Prisma.JsonNull) {
      const extracted = extractVariantBenefits(content);
      content = extracted.content as Prisma.InputJsonValue;
      variantBenefits = extracted.variantBenefits;
    }

    const nextStatus = values.status ?? existing.status;
    const item = await feedService.update(id, {
      ...(values.title !== undefined ? { title: values.title } : {}),
      ...(values.description !== undefined ? { description: values.description } : {}),
      ...(values.categoryId !== undefined ? { categoryId: values.categoryId } : {}),
      ...(values.type !== undefined ? { type: values.type } : {}),
      ...(values.status !== undefined ? { status: values.status } : {}),
      ...(values.priority !== undefined ? { priority: values.priority } : {}),
      ...(values.isFeatured !== undefined ? { isFeatured: values.isFeatured } : {}),
      ...(values.thumbnailUrl !== undefined ? { thumbnailUrl: values.thumbnailUrl || null } : {}),
      ...(values.externalUrl !== undefined ? { externalUrl: values.externalUrl || null } : {}),
      ...(values.placements !== undefined ? { placements: values.placements } : {}),
      ...(values.postedByPartnerId !== undefined ? { postedByPartnerId: values.postedByPartnerId || null } : {}),
      ...(content !== undefined ? { content } : {}),
      publishedAt:
        values.publishedAt !== undefined
          ? values.publishedAt
          : nextStatus === "PUBLISHED" && !existing.publishedAt
            ? new Date()
            : undefined,
    });

    if (effectiveType === "COURSE" && content !== undefined && content !== Prisma.JsonNull) {
      await benefitService.syncVariantBenefits(id, variantBenefits);
    }

    return apiSuccess(item);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  const { id } = await params;
  const deleted = await feedService.delete(id);
  if (!deleted) return apiError("Feed item not found", 404);
  return apiSuccess(deleted);
}
