import Link from "next/link";
import { BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { learningPathService } from "@/services/learning-path.service";
import { LearningPathCard } from "@/components/learning-path/learning-path-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function MyLearningPage() {
  const user = await requireUser();
  const data = await learningPathService.getMyLearning(user.id);

  return (
    <div className="space-y-6 sm:space-y-7">
      <div>
        <p className="text-sm font-semibold text-teal-700">My Learning</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Your learning journey</h1>
      </div>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          <BookOpen className="size-5 text-teal-700" /> Continue learning
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {data.inProgress.map(({ learningPath, progressPercent, continueHref }) => (
            <LearningPathCard
              key={learningPath.id}
              path={learningPath}
              href={continueHref ?? `/learning-paths/${learningPath.slug}`}
              progressPercent={progressPercent}
              ctaLabel="Continue"
            />
          ))}
        </div>
        {data.inProgress.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              No paths in progress.{" "}
              <Link href="/learning-paths" className="font-semibold text-teal-700 hover:underline">
                Browse learning paths
              </Link>{" "}
              to get started.
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          <CheckCircle2 className="size-5 text-teal-700" /> Completed
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {data.completed.map(({ learningPath, progressPercent }) => (
            <LearningPathCard
              key={learningPath.id}
              path={learningPath}
              href={`/learning-paths/${learningPath.slug}`}
              progressPercent={progressPercent}
              ctaLabel="Review"
            />
          ))}
        </div>
        {data.completed.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">Completed paths will appear here.</CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
          <Sparkles className="size-5 text-teal-700" /> Recommended
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {data.recommended.map((path) => (
            <LearningPathCard
              key={path.id}
              path={path}
              href={`/learning-paths/${path.slug}`}
              ctaLabel="Start exploring"
            />
          ))}
        </div>
        {data.recommended.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              You are up to date — no new recommendations right now.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
