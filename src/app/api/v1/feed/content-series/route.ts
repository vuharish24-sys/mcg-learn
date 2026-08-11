import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { generateComposedCoverImage, generateFeedContent } from "@/lib/ai-content";
import { uploadMediaFile } from "@/lib/media-upload";
import { contentSeriesGenerateSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { feedService } from "@/services/feed.service";

/**
 * Generates the actual content for each angle in an admin-approved content map
 * (see /api/v1/feed/content-map) and saves each as its own DRAFT FeedItem,
 * grouped under one ContentSeries. Runs sequentially, not in parallel — free-tier
 * AI rate limits don't tolerate a burst of simultaneous calls, and this keeps
 * provider-fallback bookkeeping (lastUsedAt/lastError) meaningful per attempt.
 * One angle failing doesn't abort the rest; failures are reported alongside
 * whatever did succeed.
 */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = contentSeriesGenerateSchema.parse(await request.json());

    const series = await prisma.contentSeries.create({ data: { topic: values.topic } });

    const created: unknown[] = [];
    const failures: { angle: string; message: string }[] = [];

    for (const angle of values.angles) {
      try {
        const generated = await generateFeedContent(values.topic, angle.format, angle.angle);

        let thumbnailUrl: string | null = null;
        try {
          const imageFile = await generateComposedCoverImage(generated.imagePrompt, generated.title);
          const uploaded = await uploadMediaFile({ file: imageFile, folder: "feed" });
          thumbnailUrl = uploaded.fileUrl;
        } catch (error) {
          console.error("AI cover image generation failed for series asset, continuing without one", error);
        }

        const item = await feedService.create({
          title: generated.title,
          description: generated.description,
          categoryId: values.categoryId,
          type: angle.format,
          status: "DRAFT",
          priority: 0,
          isFeatured: false,
          thumbnailUrl,
          content: generated.questions ? { questions: generated.questions } : undefined,
          generationTopic: values.topic,
          contentSeriesId: series.id,
          seriesAngle: angle.angle,
        });
        created.push(item);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Content series asset generation failed for angle "${angle.angle}"`, error);
        failures.push({ angle: angle.angle, message });
      }
    }

    if (created.length === 0) {
      await prisma.contentSeries.delete({ where: { id: series.id } });
      return apiError(`No assets could be generated. ${failures.map((f) => f.message).join(" ")}`, 422);
    }

    return apiSuccess({ seriesId: series.id, created, failures }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
