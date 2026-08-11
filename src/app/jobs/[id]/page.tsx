import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, HeartPulse } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getBrandingLogoUrl } from "@/lib/branding";
import { parseFeedContent } from "@/lib/feed-actions";
import { profileService } from "@/services/profile.service";
import { partnerService, isPartnerAccessOpen } from "@/services/partner.service";
import { getPartnerCandidateSession } from "@/lib/partner-candidate-session";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MediaCover } from "@/components/ui/media-cover";
import { buttonVariants } from "@/components/ui/button";
import { JobInterestForm } from "@/components/jobs/job-interest-form";
import { PartnerCandidateLoginForm } from "@/components/forms/partner-candidate-login-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await prisma.feedItem.findFirst({ where: { id, type: "JOB_POSTING" } });
  return { title: item?.title ?? "Job posting" };
}

export default async function JobPostingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { id } = await params;
  const { ref } = await searchParams;

  const [item, user, defaultLogoUrl] = await Promise.all([
    prisma.feedItem.findFirst({ where: { id, type: "JOB_POSTING" }, include: { category: true } }),
    getCurrentUser(),
    getBrandingLogoUrl(),
  ]);
  if (!item) notFound();

  const isAdmin = user?.role.key === "ADMIN";
  if (item.status !== "PUBLISHED" && !isAdmin) notFound();

  const { job } = parseFeedContent(item.content);
  const closesAt = job?.closesAt ? new Date(job.closesAt) : null;
  const isClosed = closesAt !== null && closesAt.getTime() < Date.now();

  const partner = ref ? await partnerService.getByAccessCode(ref) : null;
  const partnerBranded = partner && isPartnerAccessOpen(partner);
  const session = partnerBranded ? await getPartnerCandidateSession(partner.id) : null;
  const gated = partnerBranded && session?.valid !== true;

  const profile = user ? await profileService.getById(user.id) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          {partnerBranded ? (
            <div className="flex items-center gap-3">
              {partner.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={partner.logoUrl} alt="" className="size-8 rounded object-contain" />
              ) : null}
              <span className="text-sm font-semibold">{partner.name}</span>
              <span className="text-xs text-slate-400">×</span>
              <span className="text-xs text-slate-500">Powered by MCG Learn</span>
            </div>
          ) : (
            <Link href="/" className="flex items-center gap-2 text-sm font-bold text-teal-800 dark:text-teal-300">
              {defaultLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={defaultLogoUrl} alt="" className="size-7 rounded object-contain" />
              ) : (
                <span className="rounded-lg bg-gradient-to-br from-teal-600 to-violet-600 p-1.5 text-white">
                  <HeartPulse className="size-4" />
                </span>
              )}
              MCG Learn
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        {gated && partnerBranded && !session && (
          <Card>
            <CardContent className="p-6">
              <PartnerCandidateLoginForm accessCode={partner.accessCode} />
            </CardContent>
          </Card>
        )}

        {gated && partnerBranded && session && !session.valid && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="font-semibold">Your access to this board has expired.</p>
              <p className="mt-1 text-sm text-slate-500">
                Ask {partner.name} to mark you enrolled to continue browsing.
              </p>
            </CardContent>
          </Card>
        )}

        {!gated && item.status === "DRAFT" && (
          <Badge className="border border-amber-200 bg-amber-50 text-amber-700">Draft preview (admin only)</Badge>
        )}

        {!gated && item.thumbnailUrl && <MediaCover src={item.thumbnailUrl} alt={item.title} className="aspect-video w-full rounded-2xl" />}

        {!gated && (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{item.title}</h1>
                {isClosed && <Badge className="border border-slate-300 bg-transparent text-slate-500">Closed</Badge>}
              </div>
              {job?.company && (
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                  {job.employmentType ? ` · ${job.employmentType}` : ""}
                </p>
              )}
            </div>

            <Card>
              <CardContent className="space-y-4 p-6">
                <p className="whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {item.description}
                </p>
                {job?.eligibility && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Eligibility</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{job.eligibility}</p>
                  </div>
                )}
                {closesAt && (
                  <p className="text-xs text-slate-400">
                    {isClosed ? "Closed" : "Apply by"} {formatDate(closesAt)}
                  </p>
                )}
              </CardContent>
            </Card>

            {!isClosed && job?.ctaType === "LINK" && job.ctaUrl && (
              <a href={job.ctaUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "gradient", size: "lg" })}>
                {job.ctaLabel || "Apply Now"} <ExternalLink className="size-4" />
              </a>
            )}

            {!isClosed && job?.ctaType === "FORM" && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 font-bold">{job.ctaLabel || "Register your interest"}</h2>
                  <JobInterestForm
                    feedItemId={item.id}
                    partnerAccessCode={partnerBranded ? partner.accessCode : undefined}
                    initial={
                      profile
                        ? { fullName: profile.fullName, email: profile.email, phone: profile.phone ?? "" }
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            )}

            {isClosed && (job?.ctaType === "LINK" || job?.ctaType === "FORM") && (
              <p className="text-sm text-slate-500">This posting is no longer accepting applications.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
