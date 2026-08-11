import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jobInterestSchema } from "@/lib/validation";
import { crmService } from "@/services/crm.service";
import { partnerService, isPartnerAccessOpen } from "@/services/partner.service";

type Params = { params: Promise<{ id: string }> };

/**
 * Public — deliberately no auth check. This is the interest-capture form for
 * JOB_POSTING feed items, reachable by anonymous visitors (including
 * partner-institute students with no MCG account), so it can't require a
 * session the way the admin-facing /api/v1/leads route does.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const values = jobInterestSchema.parse(await request.json());
    if (values.feedItemId !== id) {
      return apiError("Job posting mismatch", 422);
    }

    const item = await prisma.feedItem.findFirst({
      where: { id, type: "JOB_POSTING", status: "PUBLISHED" },
    });
    if (!item) return apiError("Job posting not found", 404);

    let sourceLabel = `Job: ${item.title}`;
    if (values.partnerAccessCode) {
      const partner = await partnerService.getByAccessCode(values.partnerAccessCode);
      if (partner && isPartnerAccessOpen(partner)) {
        sourceLabel = `Job: ${item.title} (via ${partner.name})`;
      }
    }

    const user = await getCurrentUser();
    if (!values.partnerAccessCode && user) {
      sourceLabel = `Job: ${item.title} (learner)`;
    }

    const lead = await crmService.create({
      fullName: values.fullName,
      email: values.email || null,
      phone: values.phone,
      source: sourceLabel,
      status: "NEW",
    });

    if (values.notes?.trim()) {
      const systemAuthor = await prisma.user.findFirst({
        where: { role: { key: "ADMIN" } },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (systemAuthor) {
        await prisma.leadNote.create({
          data: { leadId: lead.id, authorId: systemAuthor.id, body: values.notes.trim() },
        });
      }
    }

    return apiSuccess({ submitted: true }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
