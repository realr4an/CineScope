"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell, AIPicksGrid } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
import { useLanguage } from "@/features/i18n/language-provider";
import { Button } from "@/components/ui/button";
import type { WatchlistItem } from "@/types/media";

type PriorityResponse = { mode: "priority"; data: { summary: string; order: Array<{ title: string; mediaType: "movie" | "tv"; reason: string; tmdbId?: number; href?: string }> } };

const MAX_SELECTIONS = 10;

export function AIWatchlistPriorityPanel({ items }: { items: WatchlistItem[] }) {
  const { locale } = useLanguage();
  const text = locale === "en"
    ? {
        selectAtLeastTwo: "Select at least two titles.",
        error: "The prioritization could not be loaded.",
        title: "What should I watch first?",
        description: "Pick 2 to 10 titles and get a clear order, including franchises, watch orders and theme nights.",
        button: "Help me choose",
        selected: "selected",
        timePlaceholder: "Time context, e.g. two evenings or franchise marathon",
        socialPlaceholder: "Context, e.g. with friends or in chronological order",
        empty: "No watch order available yet."
      }
    : {
        selectAtLeastTwo: "Wähle mindestens zwei Titel aus.",
        error: "Die Priorisierung konnte nicht geladen werden.",
        title: "Was zuerst schauen?",
        description: "Wähle 2 bis 10 Titel aus und lass dir eine klare Reihenfolge geben, auch für Franchises, Reihenfolgen und Themenabende.",
        button: "Hilfe bei der Reihenfolge",
        selected: "ausgewählt",
        timePlaceholder: "Zeitkontext, z. B. zwei Abende oder Franchise-Marathon",
        socialPlaceholder: "Kontext, z. B. mit Freunden oder in chronologischer Reihenfolge",
        empty: "Noch keine Reihenfolge verfügbar."
      };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [timeContext, setTimeContext] = useState("");
  const [socialContext, setSocialContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PriorityResponse["data"] | null>(null);

  const selectedItems = useMemo(() => items.filter(item => selectedIds.includes(item.id)), [items, selectedIds]);

  const toggleSelection = (itemId: string) => {
    setSelectedIds(current => current.includes(itemId) ? current.filter(id => id !== itemId) : current.length >= MAX_SELECTIONS ? current : [...current, itemId]);
  };

  const submit = async () => {
    if (selectedItems.length < 2) {
      toast.error(text.selectAtLeastTwo);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const context = [timeContext, socialContext].filter(Boolean).join(" | ");
      const response = await postAIAction<PriorityResponse>({ mode: "priority", items: selectedItems.map(item => ({ tmdbId: item.tmdbId, mediaType: item.mediaType })), context: context || undefined }, text.error);
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
    <AIPanelShell title={text.title} description={text.description} actions={<Button onClick={submit} disabled={loading}>{loading ? <RefreshCw className="size-4 animate-spin" /> : null}{text.button}</Button>}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {items.map(item => {
              const active = selectedIds.includes(item.id);
              return (
                <button key={item.id} type="button" onClick={() => toggleSelection(item.id)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? "border-primary/40 bg-primary/15 text-primary" : "border-border/50 bg-background/50 text-muted-foreground hover:text-foreground"}`}>
                  {item.title}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{selectedItems.length} / {MAX_SELECTIONS} {text.selected}.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input value={timeContext} onChange={event => setTimeContext(event.target.value)} placeholder={text.timePlaceholder} className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm" />
          <input value={socialContext} onChange={event => setSocialContext(event.target.value)} placeholder={text.socialPlaceholder} className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm" />
        </div>

        {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

        {result ? <div className="space-y-4"><div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">{result.summary}</div><AIPicksGrid picks={result.order} ordered emptyText={text.empty} /></div> : null}
      </div>
    </AIPanelShell>
  );
}
