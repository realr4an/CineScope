"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/types";
import type { FeedbackEntry } from "@/types/feedback";

export function AdminFeedbackList({
  entries,
  locale
}: {
  entries: FeedbackEntry[];
  locale: Locale;
}) {
  const [items, setItems] = useState(entries);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const text =
    locale === "en"
      ? {
          empty: "No feedback has been stored yet.",
          sender: "Sender",
          page: "Page",
          note: "AI summary",
          aiCheck: "AI checked",
          constructive: "Constructive",
          yes: "Yes",
          no: "No",
          unavailable: "Unavailable",
          anonymous: "Anonymous",
          delete: "Delete",
          deleteConfirm: "Delete this feedback entry permanently?",
          deleteSuccess: "Feedback entry deleted.",
          deleteError: "Feedback entry could not be deleted."
        }
      : {
          empty: "Es wurden noch keine Feedback-Eintraege gespeichert.",
          sender: "Absender",
          page: "Seite",
          note: "KI-Zusammenfassung",
          aiCheck: "KI geprueft",
          constructive: "Konstruktiv",
          yes: "Ja",
          no: "Nein",
          unavailable: "Nicht verfuegbar",
          anonymous: "Anonym",
          delete: "Loeschen",
          deleteConfirm: "Diesen Feedback-Eintrag endgueltig loeschen?",
          deleteSuccess: "Feedback-Eintrag wurde geloescht.",
          deleteError: "Feedback-Eintrag konnte nicht geloescht werden."
        };

  const handleDelete = async (entryId: string) => {
    if (deletingId) {
      return;
    }

    if (!window.confirm(text.deleteConfirm)) {
      return;
    }

    setDeletingId(entryId);

    try {
      const response = await fetch(`/api/admin/feedback/${entryId}`, {
        method: "DELETE"
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? text.deleteError);
      }

      setItems(previous => previous.filter(item => item.id !== entryId));
      toast.success(text.deleteSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  if (!items.length) {
    return (
      <div className="rounded-[1.75rem] border border-border/50 bg-card/50 p-6 text-sm text-muted-foreground">
        {text.empty}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map(entry => {
        const isDeleting = deletingId === entry.id;

        return (
          <article key={entry.id} className="rounded-[1.75rem] border border-border/50 bg-card/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-primary">
                <span>{entry.category}</span>
                <span className="text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString(locale === "en" ? "en-US" : "de-DE")}
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(entry.id)}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                {text.delete}
              </Button>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-5">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {text.sender}
                </div>
                <div className="mt-1 break-words">{entry.displayName ?? entry.email ?? text.anonymous}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {text.page}
                </div>
                <div className="mt-1 break-words">{entry.pagePath ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {text.note}
                </div>
                <div className="mt-1 break-words">{entry.moderationSummary ?? "-"}</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {text.aiCheck}
                </div>
                <div className="mt-1 break-words">
                  {entry.aiChecked ? `${text.yes}${entry.aiModel ? ` (${entry.aiModel})` : ""}` : text.unavailable}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {text.constructive}
                </div>
                <div className="mt-1 break-words">
                  {entry.isConstructive === null ? text.unavailable : entry.isConstructive ? text.yes : text.no}
                </div>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-foreground">
              {entry.message}
            </p>
          </article>
        );
      })}
    </div>
  );
}
