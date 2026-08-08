import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { parseFeedContent } from "@/lib/feed-actions";
import { resolveQuizPassPercentage } from "@/lib/quiz-pass";
import { prisma } from "@/lib/prisma";
import { getProfileCompleteness } from "@/services/profile.service";
import { QuizPlayer } from "@/components/feed/quiz-player";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export default async function FeedQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ learningPathId?: string }>;
}) {
  const user = await requireUser();
  const advisingReady = getProfileCompleteness(user).isReadyForAdvising;
  const { id } = await params;
  const { learningPathId } = await searchParams;
  const item = await prisma.feedItem.findFirst({
    where: { id, status: "PUBLISHED", type: "QUIZ" },
  });
  if (!item) notFound();

  const path = learningPathId
    ? await prisma.learningPath.findUnique({
        where: { id: learningPathId },
        include: { items: true },
      })
    : null;

  const content = parseFeedContent(item.content);
  const allQuestions = content.questions ?? [];
  const hasGradedQuestions = allQuestions.some((q) => typeof q.answer === "number");
  // Never send the answer key to the client before grading happens server-side.
  const questions = allQuestions.map(({ question, options }) => ({ question, options }));
  const pathItem = path?.items.find((row) => row.feedItemId === item.id);
  const passPercentage = resolveQuizPassPercentage({
    itemPassPercentage: pathItem?.passPercentage,
    pathQuizPassPercentage: path?.quizPassPercentage,
  });

  await prisma.feedItem.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });

  const backHref = path ? `/learning-paths/${path.slug}` : "/feed";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-teal-700">← Back</Link>
        <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
        <p className="mt-2 text-slate-500">{item.description}</p>
        {path && <p className="mt-2 text-sm text-teal-700">Part of: {path.title} · Pass mark {passPercentage}%</p>}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          {questions.length > 0 ? (
            <QuizPlayer
              questions={questions}
              hasGradedQuestions={hasGradedQuestions}
              feedItemId={item.id}
              learningPathId={learningPathId}
              advisingReady={advisingReady}
            />
          ) : item.externalUrl ? (
            <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
              Open external quiz
            </a>
          ) : (
            <p className="text-sm text-slate-500">No quiz questions have been configured for this item.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
