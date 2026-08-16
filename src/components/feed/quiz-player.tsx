"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Trophy } from "lucide-react";
import type { QuizQuestion } from "@/lib/feed-actions";
import { Button } from "@/components/ui/button";
import { RewardEarnedBanner } from "@/components/learning-path/reward-earned-banner";

type QuizResult = {
  passed: boolean;
  passThreshold: number;
  bestScore: number;
  attempt: { percentage: number; score: number; totalQuestions: number };
  answerKey: Record<number, number>;
  certificateJustIssued: boolean;
  certificateNumber: string | null;
  badgeJustIssued: boolean;
  badgeIcon: string | null;
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

          {result?.certificateJustIssued && <RewardEarnedBanner kind="certificate" advisingReady={advisingReady} />}
          {result?.badgeJustIssued && (
            <RewardEarnedBanner kind="badge" icon={result.badgeIcon} advisingReady={advisingReady} />
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
