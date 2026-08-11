import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { generateComposedCoverImage, generateFeedContent } from "@/lib/ai-content";
import { uploadMediaFile } from "@/lib/media-upload";
import { feedGenerateSchema } from "@/lib/validation";
import { feedService } from "@/services/feed.service";

/** Admin gives a topic; AI writes the title/description and a cover image, saved as a draft to review. */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (user.role.key !== "ADMIN") return apiError("Forbidden", 403);

  try {
    const values = feedGenerateSchema.parse(await request.json());
    const generated = await generateFeedContent(values.topic, values.type);

    // Image generation uses a free public service with no uptime guarantee —
    // don't let a hiccup there block the text content from saving.
    let thumbnailUrl: string | null = null;
    try {
      const imageFile = await generateComposedCoverImage(generated.imagePrompt, generated.title);
      const uploaded = await uploadMediaFile({ file: imageFile, folder: "feed" });
      thumbnailUrl = uploaded.fileUrl;
    } catch (error) {
      console.error("AI cover image generation failed, continuing without one", error);
    }

    const item = await feedService.create({
      title: generated.title,
      description: generated.description,
      categoryId: values.categoryId,
      type: values.type,
      status: "DRAFT",
      priority: 0,
      isFeatured: false,
      thumbnailUrl,
      content: generated.questions ? { questions: generated.questions } : undefined,
      generationTopic: values.topic,
      publishedAt: values.scheduledPublishAt ?? null,
    });

    return apiSuccess(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
