import { requireRole } from "@/lib/auth";
import { appointmentService } from "@/services/appointment.service";
import { formatDateTime } from "@/lib/utils";
import { CreateSlotForm } from "@/components/appointments/create-slot-form";
import { CreateAvailabilityRuleForm } from "@/components/appointments/create-availability-rule-form";
import { AvailabilityRuleRow } from "@/components/appointments/availability-rule-row";
import { DeleteSlotButton } from "@/components/appointments/delete-slot-button";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function MyAvailabilityPage() {
  const user = await requireRole(["CAREER_OFFICER", "TRAINER"]);
  const [slots, rules] = await Promise.all([
    appointmentService.listHostSlots(user.id),
    appointmentService.listAvailabilityRules(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">Free 1:1 appointments</p>
          <h1 className="mt-1 text-3xl font-bold">My Availability</h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Open slots for learners to book. Once booked, you&apos;ll see who reserved it here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateSlotForm />
          <CreateAvailabilityRuleForm />
        </div>
      </div>

      {rules.length > 0 && (
        <div className="space-y-2">
          <p className="font-semibold">Recurring patterns</p>
          <div className="grid gap-2">
            {rules.map((rule) => (
              <AvailabilityRuleRow key={rule.id} rule={rule} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {slots.map((slot) => (
          <Card key={slot.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{formatDateTime(slot.startsAt)}</p>
                  {!slot.appointment && (
                    <Badge className="border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
                      Open
                    </Badge>
                  )}
                  {slot.appointment?.status === "BOOKED" && <Badge>Booked</Badge>}
                  {slot.appointment?.status === "CANCELLED" && (
                    <Badge className="border border-slate-200 bg-transparent text-slate-500 dark:border-slate-700">
                      Cancelled
                    </Badge>
                  )}
                </div>
                {slot.notes && <p className="mt-1 text-sm text-slate-500">{slot.notes}</p>}
                {slot.appointment && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {slot.appointment.learner.fullName} · {slot.appointment.learner.email}
                    {slot.appointment.learner.phone ? ` · ${slot.appointment.learner.phone}` : ""}
                    {slot.appointment.learnerNotes && (
                      <span className="block text-xs text-slate-400">&ldquo;{slot.appointment.learnerNotes}&rdquo;</span>
                    )}
                  </p>
                )}
              </div>
              {!slot.appointment ? (
                <DeleteSlotButton slotId={slot.id} />
              ) : slot.appointment.status === "BOOKED" ? (
                <CancelAppointmentButton appointmentId={slot.appointment.id} />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
      {slots.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            No slots yet — open one above to let learners book time with you.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
