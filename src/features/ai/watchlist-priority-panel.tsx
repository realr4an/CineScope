"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell, AIPicksGrid } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
import { useLanguage } from "@/features/i18n/language-provider";
import { Button } from "@/components/ui/button";
import type { WatchlistItem } from "@/types/media";

type PriorityResponse = {
  mode: "priority";
  data: {
    summary: string;
    order: Array<{
      title: string;
      mediaType: "movie" | "tv";
      reason: string;
      tmdbId?: number;
      href?: string;
    }>;
  };
};

export const MAX_PRIORITY_SELECTIONS = 10;

export function AIWatchlistPriorityPanel({
  selectedItems,
  onClearSelection
}: {
  selectedItems: WatchlistItem[];
  onClearSelection: () => void;
}) {
  const { locale } = useLanguage();
  const text =
    locale === "en"
      ? {
          selectAtLeastTwo: "Select at least two titles.",
          error: "The prioritization could not be loaded.",
          title: "What should I watch first?",
          description:
            "Select titles directly in your watchlist and get a clear order, including franchises, watch orders and theme nights.",
          button: "Help me choose",
          clear: "Clear selection",
          selectedCount: "selected in the watchlist",
          helper: "Mark 2 to 10 titles directly on the cards below. The AI will then sort them into a sensible watch order.",
          timePlaceholder: "Time context, e.g. two evenings or franchise marathon",
          socialPlaceholder: "Context, e.g. with friends or in chronological order",
          empty: "No watch order available yet.",
          nothingSelected: "No titles selected yet."
        }
      : {
          selectAtLeastTwo: "Wähle mindestens zwei Titel aus.",
          error: "Die Priorisierung konnte nicht geladen werden.",
          title: "Was zuerst schauen?",
          description:
            "Wähle Titel direkt in deiner Watchlist aus und lass dir eine klare Reihenfolge geben, auch für Franchises, Reihenfolgen und Themenabende.",
          button: "Hilfe bei der Reihenfolge",
          clear: "Auswahl leeren",
          selectedCount: "in der Watchlist ausgewählt",
          helper: "Markiere 2 bis 10 Titel direkt an den Karten unten. Die KI sortiert sie dir dann in eine sinnvolle Reihenfolge.",
          timePlaceholder: "Zeitkontext, z. B. zwei Abende oder Franchise-Marathon",
          socialPlaceholder: "Kontext, z. B. mit Freunden oder in chronologischer Reihenfolge",
          empty: "Noch keine Reihenfolge verfügbar.",
          nothingSelected: "Noch keine Titel ausgewählt."
        };

  const [timeContext, setTimeContext] = useState("");
  const [socialContext, setSocialContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PriorityResponse["data"] | null>(null);

  const submit = async () => {
    if (selectedItems.length < 2) {
      toast.error(text.selectAtLeastTwo);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const context = [timeContext, socialContext].filter(Boolean).join(" | ");
      const response = await postAIAction<PriorityResponse>(
        {
          mode: "priority",
          items: selectedItems.map(item => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType
          })),
          context: context || undefined
        },
        text.error
      );
      setResult(response.data);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : text.error;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIPanelShell
      title={text.title}
      description={text.description}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onClearSelection} disabled={!selectedItems.length || loading}>
            {text.clear}
          </Button>
          <Button type="submit" form="watchlist-priority-form" disabled={loading || selectedItems.length < 2}>
            {loading ? <RefreshCw className="size-4 animate-spin" /> : null}
            {text.button}
          </Button>
        </div>
      }
    >
      <form
        id="watchlist-priority-form"
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
          <p>{text.helper}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-primary">
            {selectedItems.length} / {MAX_PRIORITY_SELECTIONS} {text.selectedCount}
          </p>
          {selectedItems.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedItems.map(item => (
                <span
                  key={item.id}
                  className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
                >
                  {item.title}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm">{text.nothingSelected}</p>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={timeContext}
            onChange={event => setTimeContext(event.target.value)}
            placeholder={text.timePlaceholder}
            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
          />
          <input
            value={socialContext}
            onChange={event => setSocialContext(event.target.value)}
            placeholder={text.socialPlaceholder}
            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
              {result.summary}
            </div>
            <AIPicksGrid picks={result.order} ordered emptyText={text.empty} />
          </div>
        ) : null}
      </form>
    </AIPanelShell>
  );
}
