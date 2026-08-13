import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.union([z.email(), z.literal(""), z.null()]).optional(),
  phone: z.string().trim().min(7).max(20),
  notes: z.string().trim().max(2000).nullable().optional(),
  /** Which course mode/version this submission is for, when the item has multiple variants. */
  variantMode: z.string().trim().max(60).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);

  try {
    const { id } = await params;
    const item = await prisma.feedItem.findFirst({
      where: {
        id,
        status: "PUBLISHED",
        type: { in: ["WEBINAR", "CAREER_TIP", "COURSE"] },
      },
    });
    if (!item) return apiError("Feed item not found", 404);

    const values = schema.parse(await request.json());
    const source =
      item.type === "WEBINAR"
        ? `Webinar: ${item.title}`
        : item.type === "COURSE"
          ? `Course: ${item.title}${values.variantMode ? ` (${values.variantMode})` : ""}`
          : `Career Guidance: ${item.title}`;

    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          fullName: values.fullName,
          email: values.email || user.email,
          phone: values.phone,
          source,
          status: "NEW",
        },
      });

      if (values.notes) {
        await tx.leadNote.create({
          data: {
            leadId: created.id,
            authorId: user.id,
            body: values.notes,
          },
        });
      }

      return created;
    });

    return apiSuccess(lead, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
