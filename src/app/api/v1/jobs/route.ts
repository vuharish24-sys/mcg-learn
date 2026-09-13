import { z } from "zod";
import { apiSuccess, handleApiError } from "@/lib/api";
import { appUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { parseFeedContent } from "@/lib/feed-actions";

const jobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Public — deliberately no auth, mirrors the existing public /jobs/[id]
 * detail page. Built for external consumption (e.g. MCG Connect's job
 * board). Only global, published postings — partner-exclusive listings
 * (postedByPartnerId set) stay off the public board by design, same
 * exclusion the main /feed page already applies.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit } = jobsQuerySchema.parse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const where = {
      type: "JOB_POSTING" as const,
      status: "PUBLISHED" as const,
      postedByPartnerId: null,
    };

    const [items, total] = await Promise.all([
      prisma.feedItem.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.feedItem.count({ where }),
    ]);

    const base = appUrl();
    const jobs = items.map((item) => {
      const { job } = parseFeedContent(item.content);
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        company: job?.company ?? null,
        location: job?.location ?? null,
        employmentType: job?.employmentType ?? null,
        eligibility: job?.eligibility ?? null,
        postedDate: item.publishedAt,
        applicationDeadline: job?.closesAt ?? null,
        applyUrl: `${base}/jobs/${item.id}`,
      };
    });

    return apiSuccess({
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
