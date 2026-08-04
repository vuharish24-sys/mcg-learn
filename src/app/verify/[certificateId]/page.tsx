import Link from "next/link";
import { HeartPulse, ShieldCheck, ShieldX } from "lucide-react";
import { certificateService } from "@/services/certificate.service";
import { appUrl } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const certificate = await certificateService.findByCertificateNumber(certificateId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <Link href="/login" className="inline-flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
          <span className="rounded-lg bg-teal-700 p-2 text-white"><HeartPulse className="size-4" /></span>
          MCG Learn Verification
        </Link>
      </header>
      <main className="mx-auto max-w-2xl p-5 md:p-10">
        {!certificate ? (
          <Card>
            <CardContent className="space-y-4 p-10 text-center">
              <ShieldX className="mx-auto size-12 text-red-500" />
              <h1 className="text-2xl font-bold">Certificate Not Found</h1>
              <p className="text-slate-500">The certificate ID <span className="font-mono">{certificateId}</span> could not be verified.</p>
              <Link href="/login" className="text-sm font-semibold text-teal-700 hover:underline">Sign in to MCG Learn</Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-5 p-8">
              <div className="flex items-center gap-3 text-teal-700">
                <ShieldCheck className="size-8" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider">Verified certificate</p>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{certificate.courseName}</h1>
                </div>
              </div>
              <div className="grid gap-3 rounded-xl border p-4 text-sm dark:border-slate-800">
                <div className="flex justify-between gap-4"><span className="text-slate-500">Certificate ID</span><span className="font-mono font-semibold">{certificate.certificateNumber}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Learner</span><span className="font-semibold">{certificate.learnerName}</span></div>
                <div className="flex justify-between gap-4"><span className="text-slate-500">Completion date</span><span>{formatDate(certificate.issueDate)}</span></div>
                {certificate.learningPath && (
                  <div className="flex justify-between gap-4"><span className="text-slate-500">Learning path</span><span>{certificate.learningPath.title}</span></div>
                )}
                <div className="flex justify-between gap-4"><span className="text-slate-500">Issued by</span><Badge>Medical Coding Global</Badge></div>
              </div>
              <p className="break-all text-xs text-slate-500">Verification URL: {appUrl()}/verify/{certificate.certificateNumber}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
