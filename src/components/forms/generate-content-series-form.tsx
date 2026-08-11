"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, fieldClassName } from "@/components/ui/input";
import { enumLabel } from "@/lib/utils";

type Angle = {
  day: number;
  angle: string;
  format: "ARTICLE" | "CAREER_TIP" | "QUIZ" | "ANNOUNCEMENT" | "INTERNAL_PROMOTION";
  rationale: string;
  include: boolean;
};

type Step = "plan" | "review" | "done";

export function GenerateContentSeriesForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("plan");

  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("6");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [angles, setAngles] = useState<Angle[]>([]);

  const [planning, setPlanning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ createdCount: number; failures: { angle: string; message: string }[] } | null>(null);

  async function planSeries() {
    setPlanning(true);
    setError("");
    const response = await fetch("/api/v1/feed/content-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, count: Number(count) || 6 }),
    });
    const payload = await response.json();
    setPlanning(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Unable to plan content series");
      return;
    }
    setAngles(
      (payload.data.angles as Omit<Angle, "include">[]).map((a) => ({ ...a, include: true })),
    );
    setStep("review");
  }

  async function generateSeries() {
    setGenerating(true);
    setError("");
    const selected = angles.filter((a) => a.include);
    const response = await fetch("/api/v1/feed/content-series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        categoryId,
        angles: selected.map(({ day, angle, format }) => ({ day, angle, format })),
      }),
    });
    const payload = await response.json();
    setGenerating(false);
    if (!response.ok) {
      setError(payload.error?.message ?? "Unable to generate content series");
      return;
    }
    setResult({ createdCount: payload.data.created.length, failures: payload.data.failures });
    setStep("done");
    router.refresh();
  }

  function close() {
    setOpen(false);
    setStep("plan");
    setTopic("");
    setCount("6");
    setAngles([]);
    setResult(null);
    setError("");
  }

  function updateAngle(index: number, patch: Partial<Angle>) {
    setAngles((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  if (!open) {
    return (
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <Layers className="size-4" /> Generate Content Series
      </Button>
    );
  }

  const selectedCount = angles.filter((a) => a.include).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Layers className="size-5 text-violet-600" /> Generate Content Series
          </h2>
          <Button variant="ghost" size="icon" onClick={close} aria-label="Close">
            <X />
          </Button>
        </div>

        <p className="mb-4 text-xs text-slate-500">
          One master topic becomes several distinct assets — a plan first, then you choose which to generate.
        </p>

        {step === "plan" && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Master topic</span>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. ICD-10-CM basics"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">How many assets</span>
              <Input type="number" min={3} max={10} value={count} onChange={(e) => setCount(e.target.value)} />
              <p className="mt-1 text-xs text-slate-500">3-10. AI will vary the angle across each one.</p>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Category</span>
              <select className={fieldClassName} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button
                variant="gradient"
                disabled={planning || topic.trim().length < 3 || !categoryId}
                onClick={planSeries}
              >
                {planning ? "Planning…" : "Plan content series"}
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Review the plan below. Uncheck anything you don&rsquo;t want, then generate the rest as drafts.
            </p>
            <div className="space-y-2">
              {angles.map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={a.include}
                    onChange={(e) => updateAngle(i, { include: e.target.checked })}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400">Day {a.day}</span>
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                        {enumLabel(a.format)}
                      </span>
                    </div>
                    <input
                      className="mt-1 w-full border-none bg-transparent p-0 text-sm font-semibold focus:outline-none"
                      value={a.angle}
                      onChange={(e) => updateAngle(i, { angle: e.target.value })}
                    />
                    <p className="mt-0.5 text-xs text-slate-500">{a.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("plan")}>Back</Button>
              <Button variant="gradient" disabled={generating || selectedCount === 0} onClick={generateSeries}>
                {generating ? "Generating…" : `Generate ${selectedCount} asset${selectedCount === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4">
            <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              Created {result.createdCount} draft{result.createdCount === 1 ? "" : "s"}. Review and publish them
              individually in the list below.
            </p>
            {result.failures.length > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-semibold">{result.failures.length} asset(s) could not be generated:</p>
                <ul className="mt-1 list-disc pl-4">
                  {result.failures.map((f, i) => (
                    <li key={i}>{f.angle}: {f.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={close}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
