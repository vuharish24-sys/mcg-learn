import { requireUser } from "@/lib/auth";
import { trainerProgramService } from "@/services/trainer-program.service";
import { formatDateTime } from "@/lib/utils";
import { ConfirmAttendanceButton } from "@/components/trainer-program/confirm-attendance-button";
import { Card, CardContent } from "@/components/ui/card";

export default async function MySessionsPage() {
  const user = await requireUser();
  const pending = await trainerProgramService.listPendingConfirmationsForStudent(user.id);

  return (
    <div className="space-y-6">
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
    </div>
  );
}
