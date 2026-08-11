import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { partnerService } from "@/services/partner.service";
import {
  partnerCandidateService,
  isCandidateAccessValid,
  candidateExpiresAt,
} from "@/services/partner-candidate.service";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartnerCandidateAddForm } from "@/components/forms/partner-candidate-add-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ managementCode: string }>;
}): Promise<Metadata> {
  const { managementCode } = await params;
  const partner = await partnerService.getByManagementCode(managementCode);
  return { title: partner ? `Manage Candidates — ${partner.name}` : "Manage Candidates" };
}

function candidateStatus(candidate: { firstLoginAt: Date | null; enrolledAt: Date | null }) {
  if (candidate.enrolledAt) return { label: "Enrolled", tone: "enrolled" as const };
  if (!candidate.firstLoginAt) return { label: "Not yet logged in", tone: "pending" as const };
  if (isCandidateAccessValid(candidate)) {
    return { label: `Active — expires ${formatDate(candidateExpiresAt(candidate)!)}`, tone: "active" as const };
  }
  return { label: "Expired", tone: "expired" as const };
}

export default async function PartnerManageCandidatesPage({
  params,
}: {
  params: Promise<{ managementCode: string }>;
}) {
  const { managementCode } = await params;
  const partner = await partnerService.getByManagementCode(managementCode);
  if (!partner) notFound();

  const candidates = await partnerCandidateService.listForPartner(partner.id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-6 py-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-bold">{partner.name} — Job Board Candidates</h1>
          <p className="text-xs text-slate-500">
            Add the students you want to be able to view your job board. Each gets 7 days of
            access from their first visit unless MCG marks them enrolled.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-6 py-8">
        <Card>
          <CardContent className="p-5">
            <PartnerCandidateAddForm managementCode={managementCode} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="divide-y p-0 dark:divide-slate-800">
            {candidates.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">No candidates added yet.</p>
            )}
            {candidates.map((candidate) => {
              const status = candidateStatus(candidate);
              return (
                <div key={candidate.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {candidate.fullName || candidate.email || candidate.phone}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {[candidate.email, candidate.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Badge
                    className={
                      status.tone === "enrolled"
                        ? "border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                        : status.tone === "expired"
                          ? "bg-red-50 text-red-700"
                          : status.tone === "active"
                            ? ""
                            : "border border-slate-200 bg-transparent text-slate-500 dark:border-slate-700"
                    }
                  >
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
