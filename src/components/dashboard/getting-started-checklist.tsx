"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { getVisitedHrefs } from "@/lib/visited-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GettingStartedChecklist({
  advisingReady,
  pathsStarted,
  hasBookedAppointment,
}: {
  advisingReady: boolean;
  pathsStarted: boolean;
  hasBookedAppointment: boolean;
}) {
  const [visitedFeed, setVisitedFeed] = useState(false);
  const [visitedSessions, setVisitedSessions] = useState(false);

  useEffect(() => {
    const visited = getVisitedHrefs();
    setVisitedFeed(visited.has("/feed"));
    setVisitedSessions(visited.has("/sessions"));
  }, []);

  const items = [
    { label: "Complete your profile", href: "/profile", done: advisingReady },
    { label: "Explore the Learning Feed", href: "/feed", done: visitedFeed },
    { label: "Start a learning path", href: "/learning-paths", done: pathsStarted },
    { label: "Check upcoming sessions", href: "/sessions", done: visitedSessions },
    { label: "Book a free career appointment", href: "/appointments", done: hasBookedAppointment },
  ];

  const doneCount = items.filter((item) => item.done).length;
  if (doneCount === items.length) return null;

  return (
    <Card className="border-violet-200 bg-violet-50/40 dark:border-violet-900 dark:bg-violet-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-violet-600" /> Getting started ({doneCount}/{items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
              item.done
                ? "text-slate-400 line-through"
                : "text-slate-700 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900"
            }`}
          >
            {item.done ? (
              <CheckCircle2 className="size-4 shrink-0 text-teal-600" />
            ) : (
              <Circle className="size-4 shrink-0 text-slate-300" />
            )}
            {item.label}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
