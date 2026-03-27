"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell, AIPicksGrid } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
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

export function AIWatchlistPriorityPanel({ items }: { items: WatchlistItem[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [timeContext, setTimeContext] = useState("");
  const [socialContext, setSocialContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PriorityResponse["data"] | null>(null);

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  const toggleSelection = (itemId: string) => {
    setSelectedIds(current =>
      current.includes(itemId)
        ? current.filter(id => id !== itemId)
        : current.length >= 5
          ? current
          : [...current, itemId]
    );
  };

  const submit = async () => {
    if (selectedItems.length < 2) {
      toast.error("Wähle mindestens zwei Titel aus.");
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
        "Die Priorisierung konnte nicht geladen werden."
      );

      setResult(response.data);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Die Priorisierung konnte nicht geladen werden.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIPanelShell
      title="Was zuerst schauen?"
      description="Lass dir aus 2 bis 5 Watchlist-Titeln eine sinnvolle Reihenfolge mit Zeit- und Situationseinordnung geben."
      actions={
        <Button onClick={submit} disabled={loading}>
          {loading ? <RefreshCw className="size-4 animate-spin" /> : null}
          Hilfe bei der Reihenfolge
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {items.map(item => {
            const active = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleSelection(item.id)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/50 bg-background/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.title}
              </button>
            );
          })}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={timeContext}
            onChange={event => setTimeContext(event.target.value)}
            placeholder="Zeitkontext, z. B. nur heute Abend"
            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
          />
          <input
            value={socialContext}
            onChange={event => setSocialContext(event.target.value)}
            placeholder="Sozialer Kontext, z. B. mit Freunden"
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
            <AIPicksGrid picks={result.order} />
          </div>
        ) : null}
      </div>
    </AIPanelShell>
  );
}
