"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, RotateCcw, Trophy, UserCircle } from "lucide-react";
import type { QuizQuestion } from "@/lib/feed-actions";
import { Button } from "@/components/ui/button";

type QuizResult = {
  passed: boolean;
  passThreshold: number;
  bestScore: number;
  attempt: { percentage: number; score: number; totalQuestions: number };
  answerKey: Record<number, number>;
  certificateJustIssued: boolean;
  certificateNumber: string | null;
};

export function QuizPlayer({
  questions,
  hasGradedQuestions,
  feedItemId,
  learningPathId,
  advisingReady = true,
}: {
  questions: Omit<QuizQuestion, "answer">[];
  hasGradedQuestions: boolean;
  feedItemId?: string;
  learningPathId?: string;
  advisingReady?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");

  async function submitQuiz() {
    setLocked(true);
    if (!feedItemId || !hasGradedQuestions) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/v1/quiz-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedItemId,
          learningPathId: learningPathId ?? null,
          answers,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error?.message ?? "Unable to save quiz attempt");
        return;
      }
      setResult(payload.data);
    } catch {
      setError("Unable to save quiz attempt");
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setAnswers({});
    setLocked(false);
    setResult(null);
    setError("");
  }

  return (
    <div className="space-y-5">
      {questions.map((question, index) => (
        <div key={`${question.question}-${index}`} className="rounded-xl border p-4 dark:border-slate-800">
          <p className="font-semibold">
            {index + 1}. {question.question}
          </p>
          <div className="mt-3 space-y-2">
            {question.options.map((option, optionIndex) => {
              const selected = answers[index] === optionIndex;
              const correctIndex = result?.answerKey[index];
              const isCorrect = correctIndex !== undefined && correctIndex === optionIndex;
              const isWrong = correctIndex !== undefined && selected && correctIndex !== optionIndex;
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                    isCorrect
                      ? "border-teal-600 bg-teal-50"
                      : isWrong
                        ? "border-red-500 bg-red-50"
                        : selected
                          ? "border-teal-500"
                          : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${index}`}
                    disabled={locked}
                    checked={selected}
                    onChange={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                  />
                  {option}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      {!locked ? (
        <Button
          variant="gradient"
          disabled={Object.keys(answers).length < questions.length || submitting}
          onClick={submitQuiz}
        >
          Submit quiz
        </Button>
      ) : (
        <div className="space-y-4">
          {submitting && <p className="text-sm text-slate-500">Grading…</p>}

          {result && (
            <div
              className={`overflow-hidden rounded-2xl border-0 p-6 text-white shadow-lg ${
                result.passed
                  ? "bg-gradient-to-br from-teal-600 to-violet-600 shadow-teal-600/20"
                  : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-600/20"
              }`}
            >
              <div className="flex items-center gap-3">
                {result.passed ? (
                  <Trophy className={`size-8 shrink-0 ${result.attempt.percentage === 100 ? "animate-bounce" : ""}`} />
                ) : (
                  <RotateCcw className="size-8 shrink-0" />
                )}
                <div>
                  <p className="text-lg font-bold">
                    {result.passed
                      ? result.attempt.percentage === 100
                        ? "Perfect score!"
                        : "Nice work — you passed!"
                      : "Not quite — you can retry"}
                  </p>
                  <p className="text-sm text-white/85">
                    {result.attempt.score} / {result.attempt.totalQuestions} correct ({result.attempt.percentage}%) ·
                    Pass mark {result.passThreshold}%
                    {result.bestScore ? ` · Best score ${result.bestScore}%` : ""}
                  </p>
                </div>
              </div>
              {!result.passed && (
                <Button variant="secondary" size="sm" className="mt-4 bg-white/15 text-white hover:bg-white/25" onClick={retry}>
                  Try again
                </Button>
              )}
            </div>
          )}

          {result?.certificateJustIssued && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-6 dark:border-teal-900 dark:bg-teal-950/40">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-violet-600 text-white">
                  <Award className="size-5" />
                </span>
                <div className="flex-1">
                  <p className="font-bold text-teal-900 dark:text-teal-200">You just earned a certificate!</p>
                  <p className="mt-1 text-sm text-teal-800/80 dark:text-teal-300/80">
                    {advisingReady
                      ? "A career officer will be in touch about your next steps."
                      : "Complete your advising profile so we can recommend your next course."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href="/my-achievements" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800">
                      <Award className="size-4" /> View certificate
                    </Link>
                    {!advisingReady && (
                      <Link href="/profile" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-300 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:text-teal-200 dark:hover:bg-teal-950">
                        <UserCircle className="size-4" /> Complete your profile
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!submitting && !result && !error && (
            <p className="flex items-center gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900">
              <CheckCircle2 className="size-4 shrink-0" /> Responses saved. This quiz has no graded answers configured.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
