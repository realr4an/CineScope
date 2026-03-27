"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { AIComparePanel } from "@/features/ai/compare-panel";
import { postAIAction } from "@/features/ai/client";
import { useLanguage } from "@/features/i18n/language-provider";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import type { AIFitResponse, AITitleInsightsResponse } from "@/lib/ai/types";
import type { MediaDetail } from "@/types/media";

type FitResponse = { mode: "fit"; data: AIFitResponse };

export function AITitlePanel({ media, initialInsights: _initialInsights, initialFit, hasProfileSignals = false }: { media: MediaDetail; initialInsights?: AITitleInsightsResponse | null; initialFit?: AIFitResponse | null; hasProfileSignals?: boolean; }) {
  const { items } = useWatchlist();
  const { locale } = useLanguage();
  const text = locale === "en"
    ? {
        fitError: "Personal fit could not be loaded.",
        refreshFit: "Refresh personal fit",
        fitHeading: "Why this fits you",
        fitRetry: "The personal fit could not be generated on first load. You can recalculate it above."
      }
    : {
        fitError: "Die persönliche Einordnung konnte nicht geladen werden.",
        refreshFit: "Passung neu bewerten",
        fitHeading: "Warum passt das zu dir?",
        fitRetry: "Die persönliche Einordnung konnte beim ersten Laden nicht erzeugt werden. Du kannst sie oben neu berechnen."
      };

  const [loadingFit, setLoadingFit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fit, setFit] = useState<AIFitResponse | null>(initialFit ?? null);

  const feedback = useMemo(() => items.filter(item => item.watched || item.liked !== null).map(item => ({ title: item.title, mediaType: item.mediaType, watched: item.watched, liked: item.liked })), [items]);

  const loadFit = async () => {
    setLoadingFit(true);
    setError(null);
    try {
      const response = await postAIAction<FitResponse>({ mode: "fit", title: { query: media.title, mediaType: media.mediaType }, feedback }, text.fitError);
      setFit(response.data);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : text.fitError;
      setError(message);
      toast.error(message);
    } finally {
      setLoadingFit(false);
    }
  };

  return (
    <div className="space-y-4">
      {(fit || error || hasProfileSignals) ? (
        <div className="rounded-[2rem] border border-border/50 bg-card/50 p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadFit} disabled={loadingFit}>
              {loadingFit ? <RefreshCw className="size-4 animate-spin" /> : null}
              {text.refreshFit}
            </Button>
          </div>
          <div className="space-y-4">
            {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
            {fit ? (
              <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{text.fitHeading}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{fit.summary}</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{fit.reasons.map(reason => <li key={reason}>- {reason}</li>)}</ul>
                {fit.caveat ? <p className="mt-3 text-xs text-muted-foreground">{fit.caveat}</p> : null}
              </div>
            ) : hasProfileSignals ? <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">{text.fitRetry}</div> : null}
          </div>
        </div>
      ) : null}

      <AIComparePanel leftPreset={{ title: media.title, mediaType: media.mediaType }} />
    </div>
  );
}
