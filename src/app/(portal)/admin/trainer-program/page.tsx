import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trainerProgramService } from "@/services/trainer-program.service";
import { COMPENSATION_TYPE_LABEL, formatRupees } from "@/lib/trainer-program";
import { formatDate, enumLabel } from "@/lib/utils";
import { AddModuleForm } from "@/components/trainer-program/add-module-form";
import { DeleteModuleButton } from "@/components/trainer-program/delete-module-button";
import { AssignTrainerForm } from "@/components/trainer-program/assign-trainer-form";
import { ToggleAssignmentActive } from "@/components/trainer-program/toggle-assignment-active";
import { ProposalReview } from "@/components/trainer-program/proposal-review";
import { TeachRequestReview } from "@/components/trainer-program/teach-request-review";
import { DeliverableReview } from "@/components/trainer-program/deliverable-review";
import { PayoutLineItemActions } from "@/components/trainer-program/payout-line-item-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminTrainerProgramPage() {
  await requireRole(["ADMIN"]);

  const [courses, modules, trainers, assignments, proposals, teachRequests, deliverables, payoutItems] = await Promise.all([
    prisma.feedItem.findMany({ where: { type: "COURSE" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    trainerProgramService.listAllModulesForBrowsing(),
    prisma.trainer.findMany({ where: { status: "ACTIVE" }, orderBy: { fullName: "asc" } }),
    trainerProgramService.listAllAssignments(),
    trainerProgramService.listAllProposals(),
    trainerProgramService.listAllTeachRequests(),
    trainerProgramService.listPendingDeliverables(),
    trainerProgramService.listPayoutLineItems(),
  ]);

  const modulesByCourse = new Map<string, typeof modules>();
  for (const m of modules) {
    modulesByCourse.set(m.feedItemId, [...(modulesByCourse.get(m.feedItemId) ?? []), m]);
  }
  const moduleOptions = modules.map((m) => ({ value: m.id, label: `${m.feedItem.title} — ${m.title}` }));
  const trainerOptions = trainers.map((t) => ({ value: t.id, label: t.fullName }));
  const courseOptions = courses.map((c) => ({ value: c.id, label: c.title }));
  const pendingProposals = proposals.filter((p) => p.status === "PENDING");
  const actionablePayouts = payoutItems.filter((p) => p.status === "PENDING" || p.status === "APPROVED");

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-teal-700">← Administration</Link>
        <h1 className="mt-2 text-3xl font-bold">Trainer Program</h1>
        <p className="mt-1 max-w-2xl text-slate-500">
          Program modules, trainer assignments, proposals, teach requests, deliverables, and payouts.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Program modules</h2>
        <div className="grid gap-3">
          {courses.map((course) => {
            const courseModules = modulesByCourse.get(course.id) ?? [];
            return (
              <Card key={course.id}>
                <CardHeader><CardTitle className="text-base">{course.title}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {courseModules.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5 text-sm dark:border-slate-800">
                      <div>
                        <p className="font-medium">{m.title}</p>
                        {m.contentUrl && <a href={m.contentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-700 hover:underline">Content link</a>}
                      </div>
                      <DeleteModuleButton moduleId={m.id} />
                    </div>
                  ))}
                  <AddModuleForm feedItemId={course.id} nextSortOrder={courseModules.length} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Trainer assignments</h2>
        <AssignTrainerForm trainers={trainerOptions} modules={moduleOptions} />
        <div className="grid gap-2">
          {assignments.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{a.trainer.fullName} → {a.courseModule.feedItem.title} — {a.courseModule.title}</p>
                  <p className="text-sm text-slate-500">{COMPENSATION_TYPE_LABEL[a.compensationType]} · {formatRupees(a.rateAmountPaise)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={a.isActive ? "" : "bg-slate-100 text-slate-500"}>{a.isActive ? "Active" : "Inactive"}</Badge>
                  <ToggleAssignmentActive assignmentId={a.id} isActive={a.isActive} />
                </div>
              </CardContent>
            </Card>
          ))}
          {assignments.length === 0 && <p className="text-sm text-slate-500">No assignments yet.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Pending proposals ({pendingProposals.length})</h2>
        <div className="grid gap-2">
          {pendingProposals.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-2 p-4">
                <div>
                  <p className="font-medium">{p.title} <span className="text-slate-400">by {p.trainer.fullName}</span></p>
                  <p className="text-sm text-slate-500">{p.description}</p>
                  <p className="text-xs text-slate-400">
                    Suggested: {COMPENSATION_TYPE_LABEL[p.proposedCompensationType]} · {formatRupees(p.proposedRateAmountPaise)}
                    {p.targetCourse && ` · Under: ${p.targetCourse.title}`}
                  </p>
                </div>
                <ProposalReview
                  proposalId={p.id}
                  courses={courseOptions}
                  suggestedCompensationType={p.proposedCompensationType}
                  suggestedRateRupees={p.proposedRateAmountPaise / 100}
                />
              </CardContent>
            </Card>
          ))}
          {pendingProposals.length === 0 && <p className="text-sm text-slate-500">No pending proposals.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Pending teach requests ({teachRequests.length})</h2>
        <div className="grid gap-2">
          {teachRequests.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-4">
                <div>
                  <p className="font-medium">{r.trainer.fullName} wants to teach <span className="text-slate-500">{r.courseModule.feedItem.title} — {r.courseModule.title}</span></p>
                  <p className="text-xs text-slate-400">Suggested: {COMPENSATION_TYPE_LABEL[r.proposedCompensationType]} · {formatRupees(r.proposedRateAmountPaise)}</p>
                </div>
                <TeachRequestReview requestId={r.id} suggestedCompensationType={r.proposedCompensationType} suggestedRateRupees={r.proposedRateAmountPaise / 100} />
              </CardContent>
            </Card>
          ))}
          {teachRequests.length === 0 && <p className="text-sm text-slate-500">No pending teach requests.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Pending deliverables ({deliverables.length})</h2>
        <div className="grid gap-2">
          {deliverables.map((d) => (
            <Card key={d.id}>
              <CardContent className="space-y-2 p-4">
                <div>
                  <p className="font-medium">{d.title} <span className="text-slate-400">by {d.trainerAssignment.trainer.fullName}</span></p>
                  <p className="text-sm text-slate-500">{d.description}</p>
                  {d.fileUrl && <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-700 hover:underline">View submission</a>}
                  <p className="text-xs text-slate-400">Pays {formatRupees(d.trainerAssignment.rateAmountPaise)} on approval</p>
                </div>
                <DeliverableReview deliverableId={d.id} />
              </CardContent>
            </Card>
          ))}
          {deliverables.length === 0 && <p className="text-sm text-slate-500">No pending deliverables.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Payout ledger</h2>
        <div className="grid gap-2">
          {actionablePayouts.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{item.trainer.fullName} — {formatRupees(item.amountPaise)}</p>
                  <p className="text-xs text-slate-400">{enumLabel(item.sourceType)} · {formatDate(item.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{enumLabel(item.status)}</Badge>
                  <PayoutLineItemActions id={item.id} status={item.status} />
                </div>
              </CardContent>
            </Card>
          ))}
          {actionablePayouts.length === 0 && <p className="text-sm text-slate-500">Nothing pending payout.</p>}
        </div>
      </section>
    </div>
  );
}
