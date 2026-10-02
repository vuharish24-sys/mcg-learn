import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { practiceLabService } from "@/services/practice-lab.service";
import { BuyButton } from "@/components/purchases/buy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { PathItemCompleteButton } from "@/components/learning-path/path-item-complete-button";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function FeedPracticeLabExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ learningPathId?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { learningPathId } = await searchParams;
  const item = await prisma.feedItem.findFirst({ where: { id, type: "PRACTICE_LAB_EXAM" } });
  if (!item) notFound();
  if (item.status !== "PUBLISHED" && user.role.key !== "ADMIN") notFound();

  const [mapping, access, pathItem] = await Promise.all([
    practiceLabService.getMapping(id),
    practiceLabService.resolveAccess(user.id, id),
    learningPathId
      ? prisma.learningPathItem.findUnique({
          where: { learningPathId_feedItemId: { learningPathId, feedItemId: id } },
          include: { learningPath: { select: { id: true, slug: true, title: true } } },
        })
      : null,
  ]);
  if (!mapping) notFound();
  if (learningPathId && !pathItem) notFound();
  const hasAccess = Boolean(access);
  if (pathItem && hasAccess) await practiceLabService.syncCompletions(user.id, { feedItemId: id, learningPathId: pathItem.learningPathId });
  const completion = pathItem
    ? await prisma.userPathItemCompletion.findUnique({
        where: { userId_learningPathId_feedItemId: { userId: user.id, learningPathId: pathItem.learningPathId, feedItemId: id } },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={pathItem ? `/learning-paths/${pathItem.learningPath.slug}` : "/feed"}
          className="text-sm font-semibold text-teal-700"
        >
          ← {pathItem ? pathItem.learningPath.title : "Back"}
        </Link>
        {item.status !== "PUBLISHED" && (
          <Badge className="ml-2 border border-amber-200 bg-amber-50 text-amber-700">
            {item.status === "DRAFT" ? "Draft preview (admin only)" : item.status}
          </Badge>
        )}
        <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
        <Badge className="mt-2 border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
          Practice Lab — instant access
        </Badge>
        <p className="mt-2 text-slate-500">{item.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{hasAccess ? "You have access" : "Unlock this"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {access?.via === "course" && (
            <p className="text-sm text-slate-500">Included with {access.courseTitle}.</p>
          )}
          {access?.via === "free" && <p className="text-sm text-slate-500">Free.</p>}
          {!hasAccess && (
            <p className="text-2xl font-bold text-teal-800">{formatRupees(mapping.priceInPaise)}</p>
          )}
          {hasAccess ? (
            <a
              href={`/api/v1/practice-lab-exams/${id}/launch${pathItem ? `?learningPathId=${pathItem.learningPathId}` : ""}`}
              className={buttonVariants({ variant: "gradient" })}
            >
              Launch Practice Lab <ExternalLink className="size-4" />
            </a>
          ) : (
            <BuyButton
              purchasableType="PRACTICE_LAB_EXAM"
              id={id}
              label={`Buy for ${formatRupees(mapping.priceInPaise)}`}
              learner={{ fullName: user.fullName, email: user.email, phone: user.phone }}
            />
          )}
        </CardContent>
      </Card>

      {pathItem && hasAccess && (
        <Card>
          <CardContent className="space-y-3 p-5">
            {completion ? (
              <p className="font-semibold text-teal-800 dark:text-teal-200">Completed in this course.</p>
            ) : pathItem.labCompletionRule === "MANUAL" ? (
              <>
                <p className="text-sm text-slate-500">Finished the exercise? Mark it complete to move on in the course.</p>
                <PathItemCompleteButton learningPathId={pathItem.learningPathId} feedItemId={id} />
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {pathItem.labCompletionRule === "ON_PASS"
                  ? `This lesson completes automatically when you pass the exercise in the Practice Lab${pathItem.passPercentage ? ` (${pathItem.passPercentage}% or more)` : ""}.`
                  : "This lesson completes automatically when you finish an attempt in the Practice Lab."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
