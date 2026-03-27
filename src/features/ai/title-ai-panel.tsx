"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell, AITagList } from "@/features/ai/ai-primitives";
import { AIComparePanel } from "@/features/ai/compare-panel";
import { postAIAction } from "@/features/ai/client";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import { Button } from "@/components/ui/button";
import type { AIFitResponse, AITitleInsightsResponse } from "@/lib/ai/types";
import type { MediaDetail } from "@/types/media";

type TitleInsightsResponse = {
  mode: "title_insights";
  data: AITitleInsightsResponse;
};

type FitResponse = {
  mode: "fit";
  data: AIFitResponse;
};

export function AITitlePanel({
  media,
  initialInsights,
  initialFit,
  hasProfileSignals = false
}: {
  media: MediaDetail;
  initialInsights?: AITitleInsightsResponse | null;
  initialFit?: AIFitResponse | null;
  hasProfileSignals?: boolean;
}) {
  const { items } = useWatchlist();
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingFit, setLoadingFit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<AITitleInsightsResponse | null>(initialInsights ?? null);
  const [fit, setFit] = useState<AIFitResponse | null>(initialFit ?? null);

  const feedback = useMemo(
    () =>
      items
        .filter(item => item.watched || item.liked !== null)
        .map(item => ({
          title: item.title,
          mediaType: item.mediaType,
          watched: item.watched,
          liked: item.liked
        })),
    [items]
  );

  const loadInsights = async () => {
    setLoadingInsights(true);
    setError(null);

    try {
      const response = await postAIAction<TitleInsightsResponse>(
        {
          mode: "title_insights",
          title: {
            query: media.title,
            mediaType: media.mediaType
          }
        },
        "Vibe-Tags konnten nicht geladen werden."
      );

      setInsights(response.data);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Vibe-Tags konnten nicht geladen werden.";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingInsights(false);
    }
  };

  const loadFit = async () => {
    setLoadingFit(true);
    setError(null);

    try {
      const response = await postAIAction<FitResponse>(
        {
          mode: "fit",
          title: {
            query: media.title,
            mediaType: media.mediaType
          },
          feedback
        },
        "Die persönliche Einordnung konnte nicht geladen werden."
      );

      setFit(response.data);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Die persönliche Einordnung konnte nicht geladen werden.";
      setError(message);
      toast.error(message);
    } finally {
      setLoadingFit(false);
    }
  };

  return (
    <div className="space-y-4">
      <AIPanelShell
        title="AI Layer"
        description="Automatisch generierte KI-Insights für Ton, Warnhinweise und persönliche Passung."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadInsights} disabled={loadingInsights}>
              {loadingInsights ? <RefreshCw className="size-4 animate-spin" /> : null}
              Vibe & Warnings aktualisieren
            </Button>
            <Button variant="outline" size="sm" onClick={loadFit} disabled={loadingFit}>
              {loadingFit ? <RefreshCw className="size-4 animate-spin" /> : null}
              Passung neu bewerten
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {insights ? (
            <div className="space-y-4">
              <AITagList tags={insights.vibeTags} />
              <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Content Warning Light
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{insights.contentWarning}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
              Die Vibe-Tags konnten beim ersten Laden nicht erzeugt werden. Du kannst den Bereich
              oben erneut anstoßen.
            </div>
          )}

          {fit ? (
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Warum passt das zu dir?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{fit.summary}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {fit.reasons.map(reason => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
              {fit.caveat ? <p className="mt-3 text-xs text-muted-foreground">{fit.caveat}</p> : null}
            </div>
          ) : hasProfileSignals ? (
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
              Die persönliche Einordnung konnte beim ersten Laden nicht erzeugt werden. Du kannst
              sie oben neu berechnen.
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
              Sobald du Watchlist-Titel als gesehen markierst oder bewertest, wird hier automatisch
              erklärt, warum dieser Titel zu deinem Geschmack passt.
            </div>
          )}
        </div>
      </AIPanelShell>

      <AIComparePanel leftPreset={{ title: media.title, mediaType: media.mediaType }} />
    </div>
  );
}
