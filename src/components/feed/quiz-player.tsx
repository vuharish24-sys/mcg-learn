"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/feed-actions";
import { Button } from "@/components/ui/button";

type QuizResult = {
  passed: boolean;
  passThreshold: number;
  bestScore: number;
  attempt: { percentage: number; score: number; totalQuestions: number };
  answerKey: Record<number, number>;
};

export function QuizPlayer({
  questions,
  hasGradedQuestions,
  feedItemId,
  learningPathId,
}: {
  questions: Omit<QuizQuestion, "answer">[];
  hasGradedQuestions: boolean;
  feedItemId?: string;
  learningPathId?: string;
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
          disabled={Object.keys(answers).length < questions.length || submitting}
          onClick={submitQuiz}
        >
          Submit quiz
        </Button>
      ) : (
        <div className="space-y-2">
          {submitting && <p className="text-sm text-slate-500">Grading…</p>}
          {result && (
            <p
              className={`rounded-lg p-4 text-sm font-medium ${
                result.passed ? "bg-teal-50 text-teal-900" : "bg-amber-50 text-amber-900"
              }`}
            >
              {`Score: ${result.attempt.score} / ${result.attempt.totalQuestions} (${result.attempt.percentage}%) · Pass mark: ${result.passThreshold}%${
                result.passed ? " · Passed" : " · Not passed — you can retry"
              }${result.bestScore ? ` · Best score: ${result.bestScore}%` : ""}`}
            </p>
          )}
          {!submitting && !result && !error && (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900">
              Responses saved. This quiz has no graded answers configured.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
