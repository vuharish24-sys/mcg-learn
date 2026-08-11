import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { partnerService, isPartnerAccessOpen } from "@/services/partner.service";
import { partnerSubscriptionService } from "@/services/partner-subscription.service";
import { isCandidateAccessValid, candidateExpiresAt } from "@/services/partner-candidate.service";
import { formatDate, enumLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartnerForm } from "@/components/forms/partner-form";
import { PartnerLinkActions } from "@/components/forms/partner-link-actions";
import { PartnerSubscriptionActions } from "@/components/forms/partner-subscription-actions";
import { PartnerCandidateEnrollToggle } from "@/components/forms/partner-candidate-enroll-toggle";

function candidateStatusLabel(candidate: { firstLoginAt: Date | null; enrolledAt: Date | null }) {
  if (candidate.enrolledAt) return "Enrolled";
  if (!candidate.firstLoginAt) return "Not yet logged in";
  if (isCandidateAccessValid(candidate)) return `Active — expires ${formatDate(candidateExpiresAt(candidate)!)}`;
  return "Expired";
}

export default async function AdminPartnersPage() {
  await requireRole(["ADMIN"]);
  const [partners, subscriptions, candidates] = await Promise.all([
    partnerService.list(),
    partnerSubscriptionService.listAll(),
    prisma.partnerCandidate.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const pendingSubscriptions = subscriptions.filter((s) => s.status === "PENDING");
  const resolvedSubscriptions = subscriptions.filter((s) => s.status !== "PENDING");
  const candidatesByPartner = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const list = candidatesByPartner.get(candidate.partnerId) ?? [];
    list.push(candidate);
    candidatesByPartner.set(candidate.partnerId, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
          <h1 className="mt-2 text-3xl font-bold">Placement Partners</h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Give other institutes a white-labeled, time-boxed link to your job board — no account
            needed for their students. Job postings themselves are managed as a feed item type
            (Admin &gt; Learning Feed &gt; Job Posting).
          </p>
        </div>
        <PartnerForm />
      </div>

      <div className="grid gap-4">
        {partners.map((partner) => {
          const placementUrl = `${appUrl()}/placements/${partner.accessCode}`;
          const managementUrl = `${appUrl()}/partners/manage/${partner.managementCode}`;
          const open = isPartnerAccessOpen(partner);
          const partnerCandidates = candidatesByPartner.get(partner.id) ?? [];
          return (
            <Card key={partner.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {partner.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={partner.logoUrl} alt="" className="size-10 rounded-lg object-contain" />
                    ) : null}
                    <div>
                      <p className="font-bold">{partner.name}</p>
                      <p className="text-xs text-slate-500">/{partner.slug}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{enumLabel(partner.status)}</Badge>
                    <Badge
                      className={
                        open
                          ? "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                          : "border border-slate-200 bg-transparent text-slate-500 dark:border-slate-700"
                      }
                    >
                      {open ? "Access open" : "Access closed"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Student board link
                  </p>
                  <p className="break-all font-mono text-xs text-slate-500">{placementUrl}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {partner.accessStartsAt ? formatDate(partner.accessStartsAt) : "No start limit"}
                  {" → "}
                  {partner.accessEndsAt ? formatDate(partner.accessEndsAt) : "No end limit"}
                  {partner.contactEmail ? ` · ${partner.contactEmail}` : ""}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <PartnerLinkActions partnerId={partner.id} placementUrl={placementUrl} />
                  <PartnerForm
                    partnerId={partner.id}
                    initial={{
                      name: partner.name,
                      slug: partner.slug,
                      logoUrl: partner.logoUrl,
                      status: partner.status,
                      accessStartsAt: partner.accessStartsAt?.toISOString() ?? null,
                      accessEndsAt: partner.accessEndsAt?.toISOString() ?? null,
                      contactName: partner.contactName,
                      contactEmail: partner.contactEmail,
                    }}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Candidate management link (give to the partner&rsquo;s staff only)
                  </p>
                  <p className="break-all font-mono text-xs text-slate-500">{managementUrl}</p>
                </div>
                <PartnerLinkActions
                  partnerId={partner.id}
                  placementUrl={managementUrl}
                  regenerateField="regenerateManagementCode"
                />

                <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800">
                    Candidates ({partnerCandidates.length})
                  </p>
                  {partnerCandidates.length === 0 && (
                    <p className="p-3 text-sm text-slate-500">None added yet.</p>
                  )}
                  {partnerCandidates.length > 0 && (
                    <div className="divide-y dark:divide-slate-800">
                      {partnerCandidates.map((candidate) => (
                        <div key={candidate.id} className="flex items-center justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {candidate.fullName || candidate.email || candidate.phone}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {[candidate.email, candidate.phone].filter(Boolean).join(" · ")} ·{" "}
                              {candidateStatusLabel(candidate)}
                            </p>
                          </div>
                          <PartnerCandidateEnrollToggle id={candidate.id} enrolled={!!candidate.enrolledAt} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {partners.length === 0 && (
          <Card><CardContent className="p-12 text-center text-slate-500">No partners yet.</CardContent></Card>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Job board subscription requests</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {pendingSubscriptions.length === 0 && (
            <p className="text-sm text-slate-500">No pending requests.</p>
          )}
          {pendingSubscriptions.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/20"
            >
              <p className="text-sm">
                <span className="font-semibold">{s.requestingPartner.name}</span> wants access to{" "}
                <span className="font-semibold">{s.targetPartner.name}</span>&rsquo;s exclusive postings
              </p>
              <PartnerSubscriptionActions id={s.id} />
            </div>
          ))}
          {resolvedSubscriptions.length > 0 && (
            <div className="space-y-2 pt-2">
              {resolvedSubscriptions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 py-1 text-sm text-slate-500">
                  <p>
                    {s.requestingPartner.name} → {s.targetPartner.name}
                  </p>
                  <Badge className={s.status === "APPROVED" ? "" : "bg-red-50 text-red-700"}>
                    {enumLabel(s.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
