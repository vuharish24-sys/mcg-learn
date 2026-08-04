import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { enumLabel, formatDate } from "@/lib/utils";
import { crmService } from "@/services/crm.service";
import { LeadNotesPanel } from "@/components/crm/lead-notes-panel";
import { StatusSelect } from "@/components/forms/status-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statuses = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "ADMITTED", "CLOSED"];

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["ADMIN", "CAREER_OFFICER"]);
  const { id } = await params;
  const lead = await crmService.getById(id);
  if (!lead) notFound();
  if (user.role.key === "CAREER_OFFICER" && lead.assignedOfficerId !== user.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/crm" className="text-sm font-semibold text-teal-700">← Back to CRM</Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{lead.fullName}</h1>
            <p className="mt-1 text-slate-500">{lead.phone}{lead.email ? ` · ${lead.email}` : ""}</p>
          </div>
          <Badge>{enumLabel(lead.status)}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Lead details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div><p className="text-xs text-slate-500">Source</p><p className="font-medium">{lead.source}</p></div>
            <div><p className="text-xs text-slate-500">Assigned officer</p><p className="font-medium">{lead.assignedOfficer?.fullName ?? "Unassigned"}</p></div>
            <div><p className="text-xs text-slate-500">Follow-up</p><p className="font-medium">{formatDate(lead.followUpAt)}</p></div>
            <div><p className="text-xs text-slate-500">Created</p><p className="font-medium">{formatDate(lead.createdAt)}</p></div>
            <div>
              <p className="mb-1.5 text-xs text-slate-500">Status</p>
              <StatusSelect endpoint={`/api/v1/leads/${lead.id}`} value={lead.status} options={statuses} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadNotesPanel
              leadId={lead.id}
              notes={lead.notes}
              currentUserId={user.id}
              canEditAll={user.role.key === "ADMIN"}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
