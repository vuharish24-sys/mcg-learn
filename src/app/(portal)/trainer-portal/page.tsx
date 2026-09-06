import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trainerService } from "@/services/trainer.service";
import { trainerProgramService } from "@/services/trainer-program.service";
import { COMPENSATION_TYPE_LABEL, formatRupees } from "@/lib/trainer-program";
import { formatDate, formatDateTime, enumLabel } from "@/lib/utils";
import { SubmitProposalForm } from "@/components/trainer-program/submit-proposal-form";
import { RequestTeachButton } from "@/components/trainer-program/request-teach-button";
import { LogClassSessionForm } from "@/components/trainer-program/log-class-session-form";
import { SubmitDeliverableForm } from "@/components/trainer-program/submit-deliverable-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function TrainerPortalPage() {
  const user = await requireUser();
  const trainer = await trainerService.findByUserId(user.id);

  if (!trainer) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-slate-500">
          No trainer profile is linked to your account yet. Contact an admin to get set up as a trainer.
        </CardContent>
      </Card>
    );
  }

  if (trainer.status !== "ACTIVE") {
    return (
      <Card>
        <CardContent className="p-12 text-center text-slate-500">
          Your trainer profile is <Badge>{enumLabel(trainer.status)}</Badge> — the trainer portal unlocks once an admin activates it.
        </CardContent>
      </Card>
    );
  }

  const [assignments, allModules, courses, proposals, payoutItems] = await Promise.all([
    trainerProgramService.listAssignmentsForTrainer(trainer.id),
    trainerProgramService.listAllModulesForBrowsing(),
    prisma.feedItem.findMany({ where: { type: "COURSE" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    trainerProgramService.listProposalsForTrainer(trainer.id),
    trainerProgramService.listPayoutLineItemsForTrainer(trainer.id),
  ]);

  const assignedModuleIds = new Set(assignments.map((a) => a.courseModuleId));
  const browsableModules = allModules.filter((m) => !assignedModuleIds.has(m.id));
  const totalEarned = payoutItems.filter((p) => p.status === "PAID").reduce((sum, p) => sum + p.amountPaise, 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-teal-700">Trainer Portal</p>
        <h1 className="mt-1 text-3xl font-bold">Welcome, {trainer.fullName}</h1>
        <p className="mt-2 text-slate-500">Total paid out so far: <span className="font-semibold text-teal-700">{formatRupees(totalEarned)}</span></p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">My assignments</h2>
        <div className="grid gap-3">
          {assignments.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="font-medium">{a.courseModule.feedItem.title} — {a.courseModule.title}</p>
                  <p className="text-sm text-slate-500">{COMPENSATION_TYPE_LABEL[a.compensationType]} · {formatRupees(a.rateAmountPaise)}</p>
                  {!a.isActive && <Badge className="bg-slate-100 text-slate-500">Inactive</Badge>}
                </div>
                {(a.compensationType === "HOURLY" || a.compensationType === "FLAT_PER_SESSION") && a.isActive && (
                  <LogClassSessionForm trainerAssignmentId={a.id} />
                )}
                {a.compensationType === "FLAT_PER_DELIVERABLE" && a.isActive && (
                  <SubmitDeliverableForm trainerAssignmentId={a.id} />
                )}
                {a.compensationType === "PER_STUDENT_USE" && (
                  <p className="text-xs text-slate-400">Earns automatically as students complete this module — no action needed.</p>
                )}
              </CardContent>
            </Card>
          ))}
          {assignments.length === 0 && <p className="text-sm text-slate-500">No assignments yet — propose a topic or request to teach one below.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Browse modules</h2>
        <div className="grid gap-2">
          {browsableModules.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                <p className="text-sm font-medium">{m.feedItem.title} — {m.title}</p>
                <RequestTeachButton courseModuleId={m.id} />
              </CardContent>
            </Card>
          ))}
          {browsableModules.length === 0 && <p className="text-sm text-slate-500">No other modules to browse right now.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">My proposals</h2>
          <SubmitProposalForm courses={courses.map((c) => ({ value: c.id, label: c.title }))} />
        </div>
        <div className="grid gap-2">
          {proposals.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(p.createdAt)}</p>
                </div>
                <Badge>{enumLabel(p.status)}</Badge>
              </CardContent>
            </Card>
          ))}
          {proposals.length === 0 && <p className="text-sm text-slate-500">No proposals submitted yet.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">My earnings</h2>
        <div className="grid gap-2">
          {payoutItems.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium">{formatRupees(p.amountPaise)}</p>
                  <p className="text-xs text-slate-400">{enumLabel(p.sourceType)} · {formatDateTime(p.createdAt)}</p>
                </div>
                <Badge>{enumLabel(p.status)}</Badge>
              </CardContent>
            </Card>
          ))}
          {payoutItems.length === 0 && <p className="text-sm text-slate-500">No earnings recorded yet.</p>}
        </div>
      </section>
    </div>
  );
}
