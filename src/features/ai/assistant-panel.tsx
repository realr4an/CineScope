"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell, AIPicksGrid } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import { Button } from "@/components/ui/button";

type AssistantResponse = {
  mode: "assistant";
  data: {
    framing: string;
    picks: Array<{
      title: string;
      mediaType: "movie" | "tv";
      reason: string;
      comparableTitle?: string;
      tmdbId?: number;
      href?: string;
    }>;
    nextStep?: string;
  };
};

const QUICK_PROMPTS = [
  "Ich habe heute Abend nur etwa 2 Stunden und will etwas starkes, aber nicht zu schweres.",
  "Ich suche etwas für Date Night, eher stimmungsvoll und zugänglich.",
  "Ich will eine Miniserie fürs Wochenende.",
  "Schlage mir etwas vor wie die Titel, die mir gefallen haben, aber etwas leichter."
];

export function AIAssistantPanel() {
  const { items } = useWatchlist();
  const [prompt, setPrompt] = useState("");
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");
  const [timeBudget, setTimeBudget] = useState("");
  const [mood, setMood] = useState("");
  const [intensity, setIntensity] = useState<"easy" | "balanced" | "intense">("balanced");
  const [socialContext, setSocialContext] = useState<
    "solo" | "parents" | "friends" | "date" | "family" | ""
  >("");
  const [referenceTitles, setReferenceTitles] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResponse["data"] | null>(null);

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

  const submit = async () => {
    if (!prompt.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await postAIAction<AssistantResponse>(
        {
          mode: "assistant",
          prompt,
          mediaType,
          timeBudget: timeBudget || undefined,
          mood: mood || undefined,
          intensity,
          socialContext: socialContext || undefined,
          referenceTitles: referenceTitles
            .split(",")
            .map(value => value.trim())
            .filter(Boolean)
            .slice(0, 3)
            .map(title => ({
              query: title,
              mediaType: "all"
            })),
          feedback
        },
        "Die KI-Auswahlhilfe konnte nicht geladen werden."
      );

      setResult(response.data);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Die KI-Auswahlhilfe konnte nicht geladen werden.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIPanelShell
      title="Assistenzmodus"
      description="Ein fokussierter KI-Layer für Stimmung, Zeit, soziale Situation und persönliche Präferenzen."
      actions={
        <Button onClick={submit} disabled={loading}>
          {loading ? <RefreshCw className="size-4 animate-spin" /> : null}
          Vorschläge holen
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(quickPrompt => (
            <button
              key={quickPrompt}
              type="button"
              onClick={() => setPrompt(quickPrompt)}
              className="rounded-full border border-border/50 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              {quickPrompt}
            </button>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          placeholder="Beschreibe, wonach dir gerade ist."
          className="min-h-28 w-full rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
        />

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <select
            value={mediaType}
            onChange={event => setMediaType(event.target.value as "all" | "movie" | "tv")}
            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
          >
            <option value="all">Film oder Serie</option>
            <option value="movie">Nur Filme</option>
            <option value="tv">Nur Serien</option>
          </select>
          <input
            value={timeBudget}
            onChange={event => setTimeBudget(event.target.value)}
            placeholder="Zeitbudget, z. B. 90 Minuten"
            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
          />
          <input
            value={mood}
            onChange={event => setMood(event.target.value)}
            placeholder="Mood, z. B. düster aber zugänglich"
            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
          />
          <select
            value={intensity}
            onChange={event =>
              setIntensity(event.target.value as "easy" | "balanced" | "intense")
            }
            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
          >
            <option value="easy">Eher leicht</option>
            <option value="balanced">Ausgewogen</option>
            <option value="intense">Eher intensiv</option>
          </select>
          <select
            value={socialContext}
            onChange={event =>
              setSocialContext(
                event.target.value as "solo" | "parents" | "friends" | "date" | "family" | ""
              )
            }
            className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm"
          >
            <option value="">Sozialer Kontext</option>
            <option value="solo">Alleine</option>
            <option value="parents">Mit Eltern</option>
            <option value="friends">Mit Freunden</option>
            <option value="date">Date Night</option>
            <option value="family">Familie</option>
          </select>
          <input
            value={referenceTitles}
            onChange={event => setReferenceTitles(event.target.value)}
            placeholder="Referenztitel, komma-getrennt"
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
              {result.framing}
            </div>
            <AIPicksGrid picks={result.picks} />
            {result.nextStep ? (
              <p className="text-sm text-muted-foreground">{result.nextStep}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </AIPanelShell>
  );
}
