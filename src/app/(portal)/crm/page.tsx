import Link from "next/link";
import { Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crmService } from "@/services/crm.service";
import { enumLabel, formatDate } from "@/lib/utils";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { StatusSelect } from "@/components/forms/status-select";
import { Card, CardContent } from "@/components/ui/card";
import { Input, fieldClassName } from "@/components/ui/input";

const statuses = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "ADMITTED", "CLOSED"];

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["ADMIN", "CAREER_OFFICER"]);
  const query = await searchParams;
  const search = typeof query.search === "string" ? query.search : undefined;
  const status = typeof query.status === "string" ? query.status : undefined;
  const [leads, officers] = await Promise.all([
    crmService.list(search, status, user.role.key === "CAREER_OFFICER" ? user.id : undefined),
    prisma.user.findMany({ where: { role: { key: "CAREER_OFFICER" }, isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Lead Management</h1><p className="mt-1 text-slate-500">Track prospects, ownership, and follow-ups.</p></div>
        <ResourceCreateForm title="Add lead" endpoint="/api/v1/leads" fields={[
          { name: "fullName", label: "Full name", required: true },
          { name: "phone", label: "Phone", required: true },
          { name: "email", label: "Email", type: "email" },
          { name: "source", label: "Lead source", required: true },
          { name: "status", label: "Status", type: "select", defaultValue: "NEW", options: statuses.map((value) => ({ value, label: enumLabel(value) })) },
          ...(user.role.key === "ADMIN" ? [{ name: "assignedOfficerId", label: "Career officer", type: "select" as const, options: officers.map((item) => ({ value: item.id, label: item.fullName })) }] : []),
          { name: "followUpAt", label: "Follow-up date", type: "datetime-local" },
        ]} />
      </div>
      <form className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[1fr_200px_auto] dark:border-slate-800 dark:bg-slate-900">
        <label className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><Input className="pl-9" name="search" defaultValue={search} placeholder="Search name, email, or phone" /></label>
        <select className={fieldClassName} name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{enumLabel(value)}</option>)}</select>
        <button type="submit" className="h-10 rounded-lg bg-slate-100 px-4 text-sm font-semibold dark:bg-slate-800">Apply</button>
      </form>
      <Card className="overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900"><tr><th className="px-5 py-4">Lead</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Source</th><th className="px-5 py-4">Officer</th><th className="px-5 py-4">Follow-up</th><th className="px-5 py-4">Status</th></tr></thead>
            <tbody className="divide-y dark:divide-slate-800">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-5 py-4 font-semibold">
                    <Link href={`/crm/${lead.id}`} className="text-teal-800 hover:underline dark:text-teal-300">
                      {lead.fullName}
                    </Link>
                    <p className="mt-1 text-xs font-normal text-slate-500">{lead._count.notes} notes</p>
                  </td>
                  <td className="px-5 py-4">{lead.phone}<p className="text-xs text-slate-500">{lead.email}</p></td>
                  <td className="px-5 py-4">{lead.source}</td>
                  <td className="px-5 py-4">{lead.assignedOfficer?.fullName ?? "Unassigned"}</td>
                  <td className="px-5 py-4">{formatDate(lead.followUpAt)}</td>
                  <td className="px-5 py-4"><StatusSelect endpoint={`/api/v1/leads/${lead.id}`} value={lead.status} options={statuses} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && <p className="p-12 text-center text-slate-500">No leads found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
