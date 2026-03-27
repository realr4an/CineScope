"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Send, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AIGeneratedBadge } from "@/features/ai/ai-primitives";
import { useLanguage } from "@/features/i18n/language-provider";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import type { AIRecommendation, MediaDetail } from "@/types/media";

async function getErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

export function RecommendationPanel() {
  const { locale } = useLanguage();
  const text = locale === "en"
    ? {
        error: "The recommendation could not be generated.",
        title: "AI recommendation chat",
        description: "Describe mood, themes, type, duration or reference titles.",
        positive: "positive titles in profile",
        negative: "negative titles in profile",
        context: "Watched titles and positive or negative watchlist feedback automatically feed into the recommendations.",
        placeholder: 'For example: "Suggest movies like the ones I liked, but a little darker."',
        submit: "Generate recommendations",
        reset: "Reset",
        movie: "Movie",
        tv: "Series",
        mood: "Mood"
      }
    : {
        error: "Die Empfehlung konnte nicht generiert werden.",
        title: "KI-Empfehlungs-Chat",
        description: "Beschreibe Stimmung, Thema, Art, Dauer oder Vergleichstitel.",
        positive: "positive Titel im Profil",
        negative: "negative Titel im Profil",
        context: "Bereits gesehene sowie positiv oder negativ bewertete Watchlist-Titel fließen automatisch in die Empfehlungen ein.",
        placeholder: 'Zum Beispiel: "Schlage mir Filme vor wie die, die mir gefallen haben, aber etwas düsterer."',
        submit: "Empfehlungen generieren",
        reset: "Zurücksetzen",
        movie: "Film",
        tv: "Serie",
        mood: "Mood"
      };

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const { items } = useWatchlist();

  const feedback = useMemo(() => items.filter(item => item.watched || item.liked !== null).map(item => ({ title: item.title, mediaType: item.mediaType, watched: item.watched, liked: item.liked })), [items]);
  const likedCount = feedback.filter(item => item.liked === true).length;
  const dislikedCount = feedback.filter(item => item.liked === false).length;

  const submit = async () => {
    if (!prompt.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/ai/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, feedback }) });

    if (!response.ok) {
      const message = await getErrorMessage(response, text.error);
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    const data = (await response.json()) as { recommendations: AIRecommendation[]; message?: string };
    setRecommendations(data.recommendations);
    if (!data.recommendations.length && data.message) {
      setError(data.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 rounded-[2rem] border border-border/50 bg-card/50 p-6">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary"><Sparkles className="size-5" /></div>
        <div className="min-w-0 space-y-2">
          <AIGeneratedBadge />
          <div>
            <h2 className="text-lg font-bold">{text.title}</h2>
            <p className="text-sm text-muted-foreground">{text.description}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-3 py-1 text-xs text-emerald-300"><ThumbsUp className="size-3.5" />{likedCount} {text.positive}</div>
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/12 px-3 py-1 text-xs text-rose-300"><ThumbsDown className="size-3.5" />{dislikedCount} {text.negative}</div>
      </div>

      <p className="text-sm text-muted-foreground">{text.context}</p>

      <Textarea value={prompt} onChange={event => setPrompt(event.target.value)} placeholder={text.placeholder} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={submit} disabled={loading} className="w-full sm:w-auto">{loading ? <RefreshCw className="size-4 animate-spin" /> : <Send className="size-4" />}{text.submit}</Button>
        <Button variant="outline" onClick={() => { setPrompt(""); setRecommendations([]); setError(null); }}>{text.reset}</Button>
      </div>

      {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}

      {recommendations.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {recommendations.map(item => (
            <Link key={`${item.mediaType}-${item.title}`} href={item.href ?? `/search?q=${encodeURIComponent(item.title)}&type=${item.mediaType}`} className="group rounded-2xl border border-border/50 bg-background/60 p-4 transition-colors hover:border-primary/40 hover:bg-background/80">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.18em] text-primary">{item.mediaType === "movie" ? text.movie : text.tv}</div>
                <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <h3 className="mt-2 text-lg font-semibold transition-colors group-hover:text-primary">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.shortReason}</p>
              {item.mood ? <p className="mt-3 text-xs text-muted-foreground">{text.mood}: {item.mood}</p> : null}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SummaryPanel({ media, initialSummary }: { media: MediaDetail; initialSummary?: string | null; }) {
  const { locale } = useLanguage();
  const text = locale === "en"
    ? {
        error: "The summary could not be generated.",
        title: "Spoiler-free AI summary",
        description: "Generated automatically with the detail page and based only on existing metadata.",
        regenerate: "Regenerate",
        generate: "Generate now",
        empty: "The summary could not be generated on first load. You can retry it here."
      }
    : {
        error: "Die Zusammenfassung konnte nicht erzeugt werden.",
        title: "Spoilerfreie KI-Zusammenfassung",
        description: "Wird automatisch mit der Detailseite erzeugt und nutzt nur vorhandene Metadaten.",
        regenerate: "Neu generieren",
        generate: "Jetzt erzeugen",
        empty: "Die Zusammenfassung konnte beim ersten Laden nicht erzeugt werden. Du kannst sie hier bei Bedarf neu anstoßen."
      };

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/ai/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: media.title, mediaType: media.mediaType, overview: media.overview, genres: media.genres.map(genre => genre.name), releaseDate: media.mediaType === "movie" ? media.releaseDate : media.firstAirDate }) });

    if (!response.ok) {
      const message = await getErrorMessage(response, text.error);
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    const data = (await response.json()) as { summary: string };
    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <div className="rounded-[2rem] border border-border/50 bg-card/50 p-5">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <AIGeneratedBadge />
          <div>
            <h3 className="text-lg font-semibold">{text.title}</h3>
            <p className="text-sm text-muted-foreground">{text.description}</p>
          </div>
        </div>
        <Button onClick={submit} disabled={loading} className="w-full sm:w-auto">{loading ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{summary ? text.regenerate : text.generate}</Button>
      </div>
      {error ? <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
      {summary ? <p className="text-sm leading-7 text-foreground/90">{summary}</p> : <p className="text-sm leading-7 text-muted-foreground">{text.empty}</p>}
    </div>
  );
}
