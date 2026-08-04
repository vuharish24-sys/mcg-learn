import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { certificateService } from "@/services/certificate.service";
import { formatDate } from "@/lib/utils";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function CertificatesPage() {
  const user = await requireRole(["ADMIN", "LEARNER"]);
  const [certificates, learners] = await Promise.all([
    certificateService.list(user.role.key === "LEARNER" ? user.id : undefined),
    user.role.key === "ADMIN"
      ? prisma.user.findMany({ where: { role: { key: "LEARNER" }, isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } })
      : [],
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Certificates</h1><p className="mt-1 text-slate-500">Verified course completion records.</p></div>
        {user.role.key === "ADMIN" && <ResourceCreateForm title="Issue certificate" endpoint="/api/v1/certificates" fields={[
          { name: "learnerId", label: "Learner", type: "select", required: true, options: learners.map((item) => ({ value: item.id, label: item.fullName })) },
          { name: "learnerName", label: "Name on certificate", required: true },
          { name: "courseName", label: "Course name", required: true },
          { name: "issueDate", label: "Issue date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
        ]} />}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {certificates.map((certificate) => (
          <Card key={certificate.id}><CardContent className="flex items-center gap-5 p-5">
            <div className="hidden size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-violet-600 text-center text-xs font-bold text-white shadow-lg shadow-teal-600/30 sm:flex">MCG<br />CERT</div>
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{certificate.certificateNumber}</p><h2 className="mt-1 truncate text-lg font-bold">{certificate.courseName}</h2><p className="mt-1 text-sm text-slate-500">{certificate.learnerName} · {formatDate(certificate.issueDate)}</p></div>
            <a href={`/api/v1/certificates/${certificate.id}/pdf`} className={buttonVariants({ variant: "outline", size: "icon" })} aria-label="Download certificate"><Download className="size-4" /></a>
          </CardContent></Card>
        ))}
      </div>
      {certificates.length === 0 && <Card><CardContent className="p-12 text-center text-slate-500">No certificates have been issued.</CardContent></Card>}
    </div>
  );
}
