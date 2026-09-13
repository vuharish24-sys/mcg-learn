import { requireUser } from "@/lib/auth";
import { trainerProgramService } from "@/services/trainer-program.service";
import { tutorSessionService } from "@/services/tutor-session.service";
import { formatDateTime } from "@/lib/utils";
import { ConfirmAttendanceButton } from "@/components/trainer-program/confirm-attendance-button";
import { BuyButton } from "@/components/purchases/buy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function MySessionsPage() {
  const user = await requireUser();
  const [pending, tutorSessions] = await Promise.all([
    trainerProgramService.listPendingConfirmationsForStudent(user.id),
    tutorSessionService.listMine(user.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-teal-700">Class sessions</p>
        <h1 className="mt-1 text-3xl font-bold">Confirm your attendance</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Confirming lets the trainer get paid for the session — please only confirm sessions you actually attended.
        </p>
      </div>

      <div className="grid gap-3">
        {pending.map((attendance) => {
          const session = attendance.classSession;
          const assignment = session.trainerAssignment;
          return (
            <Card key={attendance.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">
                    {assignment.courseModule.feedItem.title} — {assignment.courseModule.title}
                  </p>
                  <p className="text-sm text-slate-500">
                    with {assignment.trainer.fullName} · {formatDateTime(session.scheduledAt)} · {session.durationMinutes} min
                  </p>
                </div>
                <ConfirmAttendanceButton attendanceId={attendance.id} />
              </CardContent>
            </Card>
          );
        })}
        {pending.length === 0 && (
          <Card><CardContent className="p-12 text-center text-slate-500">No sessions waiting on your confirmation.</CardContent></Card>
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-teal-700">On-demand sessions</p>
        <h2 className="mt-1 text-2xl font-bold">Your tutor session requests</h2>
      </div>
      <div className="grid gap-3">
        {tutorSessions.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{s.topic}</p>
                <p className="text-sm text-slate-500">
                  with {s.trainer.fullName} · Preferred {formatDateTime(s.preferredAt)} · {s.durationMinutes} min
                </p>
              </div>
              {s.status === "PRICED" && s.priceAmountPaise ? (
                <BuyButton
                  purchasableType="TUTOR_SESSION"
                  id={s.id}
                  label={`Pay ${formatRupees(s.priceAmountPaise)}`}
                  learner={{ fullName: user.fullName, email: user.email, phone: user.phone }}
                />
              ) : (
                <Badge
                  className={
                    s.status === "CONFIRMED"
                      ? "border border-teal-200 bg-teal-50 text-teal-700"
                      : s.status === "DECLINED" || s.status === "CANCELLED"
                        ? "border border-red-200 bg-red-50 text-red-700"
                        : ""
                  }
                >
                  {s.status === "REQUESTED" ? "Awaiting quote" : s.status}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
        {tutorSessions.length === 0 && (
          <Card><CardContent className="p-8 text-center text-slate-500">No session requests yet — ask a trainer from the Trainer Network page.</CardContent></Card>
        )}
      </div>
    </div>
  );
}
