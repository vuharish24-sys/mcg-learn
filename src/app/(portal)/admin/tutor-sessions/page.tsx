import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { tutorSessionService } from "@/services/tutor-session.service";
import { formatDate } from "@/lib/utils";
import { TutorSessionRequestReview } from "@/components/trainer-program/tutor-session-request-review";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminTutorSessionsPage() {
  await requireRole(["ADMIN"]);
  const requests = await tutorSessionService.listAllPending();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
        <h1 className="mt-2 text-3xl font-bold">Tutor Sessions</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Requests for a paid, on-demand session with a specific trainer. Quote a price to let the
          student pay and confirm, or decline if it can&rsquo;t be scheduled.
        </p>
      </div>

      {requests.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-slate-500">No pending requests.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">{r.topic}</CardTitle>
                <Badge className={r.status === "PRICED" ? "border border-amber-200 bg-amber-50 text-amber-700" : ""}>
                  {r.status === "PRICED" ? `Quoted ${formatRupees(r.priceAmountPaise ?? 0)} — awaiting payment` : "Awaiting quote"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-slate-500">
                  {r.student.fullName} ({r.student.email}) with {r.trainer.fullName} · Preferred{" "}
                  {formatDate(r.preferredAt)} · {r.durationMinutes} min
                </p>
                <TutorSessionRequestReview requestId={r.id} status={r.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
