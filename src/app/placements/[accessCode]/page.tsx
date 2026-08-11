import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseFeedContent } from "@/lib/feed-actions";
import { partnerService, isPartnerAccessOpen } from "@/services/partner.service";
import { partnerSubscriptionService } from "@/services/partner-subscription.service";
import { getPartnerCandidateSession } from "@/lib/partner-candidate-session";
import { Card, CardContent } from "@/components/ui/card";
import { MediaCover } from "@/components/ui/media-cover";
import { Badge } from "@/components/ui/badge";
import { PartnerSubscriptionRequestForm } from "@/components/forms/partner-subscription-request-form";
import { PartnerCandidateLoginForm } from "@/components/forms/partner-candidate-login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ accessCode: string }>;
}): Promise<Metadata> {
  const { accessCode } = await params;
  const partner = await partnerService.getByAccessCode(accessCode);
  return { title: partner ? `Job Board — ${partner.name}` : "Job Board" };
}

export default async function PlacementsPage({
  params,
}: {
  params: Promise<{ accessCode: string }>;
}) {
  const { accessCode } = await params;
  const partner = await partnerService.getByAccessCode(accessCode);
  if (!partner) notFound();

  const open = isPartnerAccessOpen(partner);
  const session = open ? await getPartnerCandidateSession(partner.id) : null;
  const canView = open && session?.valid === true;

  const [approvedTargetIds, subscriptions, otherPartners] = canView
    ? await Promise.all([
        partnerSubscriptionService.getApprovedTargetIds(partner.id),
        prisma.partnerSubscription.findMany({ where: { requestingPartnerId: partner.id } }),
        prisma.partner.findMany({
          where: { id: { not: partner.id }, status: "ACTIVE" },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
      ])
    : [[], [], []];

  const postings = canView
    ? await prisma.feedItem.findMany({
        where: {
          type: "JOB_POSTING",
          status: "PUBLISHED",
          OR: [
            { postedByPartnerId: null },
            { postedByPartnerId: partner.id },
            ...(approvedTargetIds.length ? [{ postedByPartnerId: { in: approvedTargetIds } }] : []),
          ],
        },
        orderBy: [{ priority: "desc" }, { publishedAt: "desc" }],
        take: 100,
      })
    : [];

  const now = Date.now();
  const activePostings = postings.filter((item) => {
    const { job } = parseFeedContent(item.content);
    if (!job?.closesAt) return true;
    return new Date(job.closesAt).getTime() >= now;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-6 py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          {partner.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partner.logoUrl} alt="" className="size-12 rounded-lg object-contain" />
          ) : null}
          <div>
            <h1 className="text-xl font-bold">{partner.name} Job Board</h1>
            <p className="text-xs text-slate-500">Powered by MCG Learn</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-6 py-8">
        {!open && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="font-semibold">This link is not currently active.</p>
              <p className="mt-1 text-sm text-slate-500">
                Contact {partner.name} or MCG Learn if you believe this is a mistake.
              </p>
            </CardContent>
          </Card>
        )}

        {open && !session && (
          <Card>
            <CardContent className="p-6">
              <PartnerCandidateLoginForm accessCode={partner.accessCode} />
            </CardContent>
          </Card>
        )}

        {open && session && !session.valid && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="font-semibold">Your access to this board has expired.</p>
              <p className="mt-1 text-sm text-slate-500">
                Ask {partner.name} to mark you enrolled to continue browsing.
              </p>
            </CardContent>
          </Card>
        )}

        {canView && activePostings.length === 0 && (
          <Card><CardContent className="p-8 text-center text-slate-500">No open positions right now — check back soon.</CardContent></Card>
        )}

        {canView &&
          activePostings.map((item) => {
            const { job } = parseFeedContent(item.content);
            return (
              <Link key={item.id} href={`/jobs/${item.id}?ref=${partner.accessCode}`}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <div className="flex gap-4">
                    {item.thumbnailUrl && (
                      <MediaCover src={item.thumbnailUrl} alt={item.title} className="h-28 w-28 shrink-0" />
                    )}
                    <CardContent className="min-w-0 flex-1 p-4">
                      <h2 className="font-bold">{item.title}</h2>
                      {job?.company && (
                        <p className="mt-0.5 text-sm text-slate-500">
                          {job.company}
                          {job.location ? ` · ${job.location}` : ""}
                        </p>
                      )}
                      <p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.description}</p>
                      {job?.employmentType && <Badge className="mt-2">{job.employmentType}</Badge>}
                    </CardContent>
                  </div>
                </Card>
              </Link>
            );
          })}

        {canView && otherPartners.length > 0 && (
          <Card>
            <CardContent className="space-y-3 p-5">
              <div>
                <p className="font-bold">See more job boards</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  Request access to another institute&rsquo;s exclusive postings — subject to MCG Learn approval.
                </p>
              </div>
              <PartnerSubscriptionRequestForm
                accessCode={partner.accessCode}
                partners={otherPartners}
                existingRequests={subscriptions.map((s) => ({
                  targetPartnerId: s.targetPartnerId,
                  status: s.status,
                }))}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
