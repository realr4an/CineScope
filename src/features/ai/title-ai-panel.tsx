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
        fitRetry: "The personal fit could not be generated on first load. You can recalculate it above.",
        possibleFriction: "What may not fit as well",
        limitedData:
          "This assessment is based on only a small amount of watch history, so treat it as an early signal rather than a strong conclusion.",
        noLikedData:
          "You have little or no positive rating data yet, so the fit is inferred more cautiously from watched titles and limited signals.",
        confidenceLow: "Lower confidence",
        confidenceMedium: "Moderate confidence",
        confidenceHigh: "Stronger confidence"
      }
    : {
        fitError: "Die persönliche Einordnung konnte nicht geladen werden.",
        refreshFit: "Passung neu bewerten",
        fitHeading: "Warum passt das zu dir?",
        fitRetry: "Die persönliche Einordnung konnte beim ersten Laden nicht erzeugt werden. Du kannst sie oben neu berechnen.",
        possibleFriction: "Was eher dagegen sprechen könnte",
        limitedData:
          "Diese Einschätzung basiert bisher nur auf wenigen Watchlist-Signalen und ist daher eher ein vorsichtiger Hinweis als eine starke Aussage.",
        noLikedData:
          "Es gibt noch kaum oder keine positiven Bewertungen von dir, deshalb wird die Passung vorsichtiger aus gesehenen Titeln und wenigen Signalen abgeleitet.",
        confidenceLow: "Geringe Sicherheit",
        confidenceMedium: "Mittlere Sicherheit",
        confidenceHigh: "Höhere Sicherheit"
      };

  const [loadingFit, setLoadingFit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fit, setFit] = useState<AIFitResponse | null>(initialFit ?? null);

  const feedback = useMemo(() => items.filter(item => item.watched || item.liked !== null).map(item => ({ title: item.title, mediaType: item.mediaType, watched: item.watched, liked: item.liked })), [items]);
  const feedbackStats = useMemo(() => {
    const signalCount = feedback.length;
    const likedCount = feedback.filter(item => item.liked === true).length;

    return {
      signalCount,
      likedCount,
      hasLimitedData: signalCount > 0 && signalCount < 4,
      hasNoPositiveRatings: signalCount > 0 && likedCount === 0
    };
  }, [feedback]);

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
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{text.fitHeading}</h3>
                  {fit.confidence ? (
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      {fit.confidence === "low"
                        ? text.confidenceLow
                        : fit.confidence === "medium"
                          ? text.confidenceMedium
                          : text.confidenceHigh}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{fit.summary}</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{fit.reasons.map(reason => <li key={reason}>- {reason}</li>)}</ul>
                {fit.counterpoints?.length ? (
                  <div className="mt-4 rounded-2xl border border-border/50 bg-card/50 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {text.possibleFriction}
                    </h4>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {fit.counterpoints.map(point => (
                        <li key={point}>- {point}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {fit.dataNote || feedbackStats.hasLimitedData || feedbackStats.hasNoPositiveRatings ? (
                  <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/8 p-4 text-sm text-muted-foreground">
                    <p>{fit.dataNote ?? (feedbackStats.hasNoPositiveRatings ? text.noLikedData : text.limitedData)}</p>
                  </div>
                ) : null}
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
