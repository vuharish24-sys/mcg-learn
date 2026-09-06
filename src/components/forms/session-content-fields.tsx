"use client";

import { useState } from "react";
import { Input, Textarea, fieldClassName } from "@/components/ui/input";
import { SESSION_TYPE_LABEL, type SessionType } from "@/lib/feed-actions";

type SessionContentState = {
  sessionType: SessionType;
  webinarAt: string;
  meetingUrl: string;
  location: string;
};

const EMPTY: SessionContentState = {
  sessionType: "WEBINAR",
  webinarAt: "",
  meetingUrl: "",
  location: "",
};

/** datetime-local inputs need "YYYY-MM-DDTHH:mm", not a full ISO string with seconds/zone. */
function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseInitial(raw: string): SessionContentState {
  if (!raw.trim()) return EMPTY;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return EMPTY;
    return {
      sessionType: data.sessionType === "FREE_SESSION" || data.sessionType === "CLASS" ? data.sessionType : "WEBINAR",
      webinarAt: toDatetimeLocal(data.webinarAt ?? ""),
      meetingUrl: data.meetingUrl ?? "",
      location: data.location ?? "",
    };
  } catch {
    return EMPTY;
  }
}

function toContentJson(session: SessionContentState) {
  return JSON.stringify({
    sessionType: session.sessionType,
    ...(session.webinarAt ? { webinarAt: new Date(session.webinarAt).toISOString() } : {}),
    ...(session.meetingUrl.trim() ? { meetingUrl: session.meetingUrl.trim() } : {}),
    ...(session.location.trim() ? { location: session.location.trim() } : {}),
  });
}

export function SessionContentFields({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [session, setSession] = useState<SessionContentState>(() => parseInitial(defaultValue));

  function update<K extends keyof SessionContentState>(key: K, value: SessionContentState[K]) {
    setSession((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-300 p-3 dark:border-slate-700">
      <span className="block text-sm font-medium">Session details</span>
      <input type="hidden" name={name} value={toContentJson(session)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Session type</span>
          <select
            className={fieldClassName}
            value={session.sessionType}
            onChange={(e) => update("sessionType", e.target.value as SessionType)}
          >
            {Object.entries(SESSION_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Date & time</span>
          <Input
            type="datetime-local"
            value={session.webinarAt}
            onChange={(e) => update("webinarAt", e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Meeting link (Zoom, Google Meet, YouTube Live, etc.)</span>
        <Input
          type="url"
          value={session.meetingUrl}
          onChange={(e) => update("meetingUrl", e.target.value)}
          placeholder="https://..."
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Venue / additional details (optional)</span>
        <Textarea
          value={session.location}
          onChange={(e) => update("location", e.target.value)}
          rows={2}
        />
      </label>
    </div>
  );
}
