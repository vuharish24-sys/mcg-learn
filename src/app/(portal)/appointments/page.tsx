import { requireUser } from "@/lib/auth";
import { appointmentService } from "@/services/appointment.service";
import { formatDateTime, enumLabel } from "@/lib/utils";
import { BookAppointmentButton } from "@/components/appointments/book-appointment-button";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function AppointmentsPage() {
  const user = await requireUser();
  const [openSlots, myAppointments] = await Promise.all([
    appointmentService.listOpenSlots(),
    appointmentService.listLearnerAppointments(user.id),
  ]);

  const upcomingBooked = myAppointments.filter(
    (a) => a.status === "BOOKED" && a.slot.startsAt.getTime() > Date.now(),
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-teal-700">Free 1:1 appointments</p>
        <h1 className="mt-1 text-3xl font-bold">Appointments</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Book a free session with a career officer or trainer — pick any open slot below.
        </p>
      </div>

      {upcomingBooked.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">My upcoming appointments</h2>
          <div className="grid gap-3">
            {upcomingBooked.map((appt) => (
              <Card key={appt.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div>
                    <p className="font-semibold">{appt.slot.host.fullName}</p>
                    <p className="text-sm text-slate-500">{formatDateTime(appt.slot.startsAt)}</p>
                    {appt.slot.meetingUrl && (
                      <a href={appt.slot.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-700 hover:underline">
                        Meeting link
                      </a>
                    )}
                  </div>
                  <CancelAppointmentButton appointmentId={appt.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Open slots</h2>
        <div className="grid gap-3">
          {openSlots.map((slot) => (
            <Card key={slot.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{slot.host.fullName}</p>
                    <Badge className="border border-slate-200 bg-transparent text-slate-600 dark:border-slate-700">
                      {enumLabel(slot.host.role.key)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{formatDateTime(slot.startsAt)}</p>
                  {slot.notes && <p className="mt-1 text-sm text-slate-500">{slot.notes}</p>}
                </div>
                <BookAppointmentButton slotId={slot.id} />
              </CardContent>
            </Card>
          ))}
        </div>
        {openSlots.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-slate-500">
              No open slots right now — check back soon.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
