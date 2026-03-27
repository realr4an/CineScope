"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell, AIPicksGrid } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
import { useLanguage } from "@/features/i18n/language-provider";
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

export function AIAssistantPanel() {
  const { items } = useWatchlist();
  const { locale } = useLanguage();
  const text = locale === "en"
    ? {
        quickPrompts: [
          "I only have about 2 hours tonight and want something strong but not too heavy.",
          "I need something for date night, atmospheric and accessible.",
          "I want a miniseries for the weekend.",
          "Recommend something like the titles I liked, but a bit lighter."
        ],
        loadError: "The AI assistant could not be loaded.",
        title: "Assistant mode",
        description: "A focused AI layer for mood, time, social context and personal preferences.",
        button: "Get suggestions",
        promptPlaceholder: "Describe what you are in the mood for.",
        typeAll: "Movie or series",
        typeMovie: "Movies only",
        typeTv: "Series only",
        timePlaceholder: "Time budget, e.g. 90 minutes",
        moodPlaceholder: "Mood, e.g. dark but accessible",
        easy: "Lighter",
        balanced: "Balanced",
        intense: "More intense",
        social: "Social context",
        solo: "Solo",
        parents: "With parents",
        friends: "With friends",
        date: "Date night",
        family: "Family",
        referencePlaceholder: "Reference titles, comma-separated",
        noAllowed: "No suitable titles could be safely resolved for the stored age yet."
      }
    : {
        quickPrompts: [
          "Ich habe heute Abend nur etwa 2 Stunden und will etwas starkes, aber nicht zu schweres.",
          "Ich suche etwas für Date Night, eher stimmungsvoll und zugänglich.",
          "Ich will eine Miniserie fürs Wochenende.",
          "Schlage mir etwas vor wie die Titel, die mir gefallen haben, aber etwas leichter."
        ],
        loadError: "Die KI-Auswahlhilfe konnte nicht geladen werden.",
        title: "Assistenzmodus",
        description: "Ein fokussierter KI-Layer für Stimmung, Zeit, soziale Situation und persönliche Präferenzen.",
        button: "Vorschläge holen",
        promptPlaceholder: "Beschreibe, wonach dir gerade ist.",
        typeAll: "Film oder Serie",
        typeMovie: "Nur Filme",
        typeTv: "Nur Serien",
        timePlaceholder: "Zeitbudget, z. B. 90 Minuten",
        moodPlaceholder: "Mood, z. B. düster aber zugänglich",
        easy: "Eher leicht",
        balanced: "Ausgewogen",
        intense: "Eher intensiv",
        social: "Sozialer Kontext",
        solo: "Alleine",
        parents: "Mit Eltern",
        friends: "Mit Freunden",
        date: "Date Night",
        family: "Familie",
        referencePlaceholder: "Referenztitel, komma-getrennt",
        noAllowed: "Für das hinterlegte Alter konnten aktuell keine passenden Titel sicher aufgelöst werden."
      };

  const [prompt, setPrompt] = useState("");
  const [mediaType, setMediaType] = useState<"all" | "movie" | "tv">("all");
  const [timeBudget, setTimeBudget] = useState("");
  const [mood, setMood] = useState("");
  const [intensity, setIntensity] = useState<"easy" | "balanced" | "intense">("balanced");
  const [socialContext, setSocialContext] = useState<"solo" | "parents" | "friends" | "date" | "family" | "">("");
  const [referenceTitles, setReferenceTitles] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResponse["data"] | null>(null);

  const feedback = useMemo(
    () => items.filter(item => item.watched || item.liked !== null).map(item => ({ title: item.title, mediaType: item.mediaType, watched: item.watched, liked: item.liked })),
    [items]
  );

  const submit = async () => {
    if (!prompt.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await postAIAction<AssistantResponse>({
        mode: "assistant",
        prompt,
        mediaType,
        timeBudget: timeBudget || undefined,
        mood: mood || undefined,
        intensity,
        socialContext: socialContext || undefined,
        referenceTitles: referenceTitles.split(",").map(value => value.trim()).filter(Boolean).slice(0, 3).map(title => ({ query: title, mediaType: "all" })),
        feedback
      }, text.loadError);

      setResult(response.data);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : text.loadError;
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
      actions={<Button type="submit" form="ai-assistant-form" disabled={loading}>{loading ? <RefreshCw className="size-4 animate-spin" /> : null}{text.button}</Button>}
    >
      <form
        id="ai-assistant-form"
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <div className="flex flex-wrap gap-2">
          {text.quickPrompts.map(quickPrompt => (
            <button key={quickPrompt} type="button" onClick={() => setPrompt(quickPrompt)} className="rounded-full border border-border/50 bg-background/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
              {quickPrompt}
            </button>
          ))}
        </div>

        <textarea value={prompt} onChange={event => setPrompt(event.target.value)} onKeyDown={event => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            submit();
          }
        }} placeholder={text.promptPlaceholder} className="min-h-28 w-full rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/30" />

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <select value={mediaType} onChange={event => setMediaType(event.target.value as "all" | "movie" | "tv")} className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm">
            <option value="all">{text.typeAll}</option>
            <option value="movie">{text.typeMovie}</option>
            <option value="tv">{text.typeTv}</option>
          </select>
          <input value={timeBudget} onChange={event => setTimeBudget(event.target.value)} placeholder={text.timePlaceholder} className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm" />
          <input value={mood} onChange={event => setMood(event.target.value)} placeholder={text.moodPlaceholder} className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm" />
          <select value={intensity} onChange={event => setIntensity(event.target.value as "easy" | "balanced" | "intense")} className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm">
            <option value="easy">{text.easy}</option>
            <option value="balanced">{text.balanced}</option>
            <option value="intense">{text.intense}</option>
          </select>
          <select value={socialContext} onChange={event => setSocialContext(event.target.value as any)} className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm">
            <option value="">{text.social}</option>
            <option value="solo">{text.solo}</option>
            <option value="parents">{text.parents}</option>
            <option value="friends">{text.friends}</option>
            <option value="date">{text.date}</option>
            <option value="family">{text.family}</option>
          </select>
          <input value={referenceTitles} onChange={event => setReferenceTitles(event.target.value)} placeholder={text.referencePlaceholder} className="h-11 rounded-xl border border-border/60 bg-background px-3 text-sm" />
        </div>

        {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

        {result ? (result.picks.length ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">{result.framing}</div>
            <AIPicksGrid picks={result.picks} />
            {result.nextStep ? <p className="text-sm text-muted-foreground">{result.nextStep}</p> : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">{text.noAllowed}</div>
        )) : null}
      </form>
    </AIPanelShell>
  );
}
