import Link from "next/link";
import { Download, ExternalLink, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { certificateService } from "@/services/certificate.service";
import { badgeService } from "@/services/badge.service";
import { appUrl } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function MyAchievementsPage() {
  const user = await requireUser();
  const [certificates, badges] = await Promise.all([
    certificateService.listAchievements(user.id),
    badgeService.listAchievements(user.id),
  ]);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-teal-700">My Achievements</p>
        <h1 className="mt-1 text-3xl font-bold">Certificates & badges</h1>
        <p className="mt-2 text-slate-500">Download, view, and verify your earned credentials.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Certificates</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {certificates.map((certificate) => (
            <Card key={certificate.id} className="transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-violet-600 text-center text-xs font-bold text-white shadow-lg shadow-teal-600/30">
                  MCG<br />CERT
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{certificate.certificateNumber}</p>
                  <h2 className="mt-1 truncate text-lg font-bold">{certificate.courseName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{certificate.learnerName} · {formatDate(certificate.issueDate)}</p>
                  {certificate.learningPath && <Badge className="mt-2">Learning path</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/verify/${certificate.certificateNumber}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <ShieldCheck className="size-4" /> Verify
                  </Link>
                  <a href={`/api/v1/certificates/${certificate.id}/pdf`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Download className="size-4" /> PDF
                  </a>
                  <Link href={`/verify/${certificate.certificateNumber}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    <ExternalLink className="size-4" /> View
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {certificates.length === 0 && (
          <Card><CardContent className="p-12 text-center text-slate-500">Complete a learning path to earn your first certificate.</CardContent></Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Badges</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <Card key={badge.id} className="transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-violet-600 text-3xl shadow-lg shadow-teal-600/30">
                  {badge.icon}
                </span>
                <p className="font-bold">{badge.pathTitle}</p>
                <p className="text-xs text-slate-500">{formatDate(badge.issuedAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        {badges.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-slate-500">
              Complete a badge-type learning path to earn your first badge.
            </CardContent>
          </Card>
        )}
      </section>

      <p className="text-xs text-slate-400">Verification base URL: {appUrl()}/verify/[certificate-id]</p>
    </div>
  );
}
