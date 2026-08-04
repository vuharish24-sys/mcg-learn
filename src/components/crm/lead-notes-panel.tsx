"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

type TimelineNote = {
  id: string;
  body: string;
  createdAt: string | Date;
  author: { id: string; fullName: string };
};

export function LeadNotesPanel({
  leadId,
  notes,
  currentUserId,
  canEditAll,
}: {
  leadId: string;
  notes: TimelineNote[];
  currentUserId: string;
  canEditAll: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function createNote() {
    setSubmitting(true);
    setError("");
    const response = await fetch(`/api/v1/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save note");
      return;
    }
    setBody("");
    router.refresh();
  }

  async function saveEdit(noteId: string) {
    setSubmitting(true);
    setError("");
    const response = await fetch(`/api/v1/leads/${leadId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editBody }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to update note");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-xl border p-4 dark:border-slate-800">
        <h3 className="font-semibold">Add note</h3>
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Call summary, next steps, or follow-up detail"
        />
        <Button disabled={submitting || body.trim().length === 0} onClick={createNote}>
          {submitting ? "Saving…" : "Save note"}
        </Button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="space-y-4">
        <h3 className="font-semibold">Timeline</h3>
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet.</p>
        ) : (
          notes.map((note) => {
            const canEdit = canEditAll || note.author.id === currentUserId;
            return (
              <div key={note.id} className="relative border-l-2 border-teal-200 pl-4 dark:border-teal-900">
                <div className="absolute -left-[5px] top-1 size-2 rounded-full bg-teal-600" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{note.author.fullName}</p>
                  <p className="text-xs text-slate-500">{formatDate(note.createdAt)}</p>
                </div>
                {editingId === note.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea value={editBody} onChange={(event) => setEditBody(event.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={submitting} onClick={() => saveEdit(note.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{note.body}</p>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-1 px-0"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditBody(note.body);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
