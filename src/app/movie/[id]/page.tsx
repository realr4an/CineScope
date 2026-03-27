import Link from "next/link";
import { ArrowLeft, Calendar, Clock, DollarSign, Star } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CastSection, InfoPanel, TrailerSection } from "@/components/sections/detail-components";
import { HorizontalMediaRow } from "@/components/sections/media-sections";
import { GenreList, RatingBadge, StatPill } from "@/components/shared/ui-components";
import { DetailSkeleton } from "@/components/states/skeletons";
import { ErrorState } from "@/components/states/state-components";
import { SummaryPanel } from "@/features/ai-chat/ai-panel";
import { AITitlePanel } from "@/features/ai/title-ai-panel";
import { WhereToWatchSection } from "@/features/watch-providers/where-to-watch-section";
import { WatchlistFeedbackControls } from "@/features/watchlist/watchlist-feedback-controls";
import { WatchlistToggleButton } from "@/features/watchlist/watchlist-toggle-button";
import { formatCurrency, formatDate, formatRuntime } from "@/lib/format";
import { getMovieDetail } from "@/lib/tmdb/movies";

type MoviePageProps = {
  params: Promise<{ id: string }>;
};

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;

  try {
    const movie = await getMovieDetail(Number(id));

    return (
      <AppShell>
        <div className="space-y-10">
          <section className="relative overflow-hidden rounded-[2rem] border border-border/50">
            <img
              src={movie.backdropUrl ?? movie.posterUrl ?? ""}
              alt={movie.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="relative z-10 min-h-[60vh] p-8 sm:p-12">
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Zur Startseite
              </Link>
              <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-end">
                <div className="hidden overflow-hidden rounded-3xl border border-border/50 shadow-2xl shadow-black/40 lg:block">
                  <img src={movie.posterUrl ?? ""} alt={movie.title} className="w-full" />
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="inline-flex rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      Film
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{movie.title}</h1>
                    {movie.tagline ? (
                      <p className="text-lg italic text-muted-foreground">"{movie.tagline}"</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <RatingBadge rating={movie.rating} voteCount={movie.voteCount} />
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      {formatDate(movie.releaseDate)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="size-4" />
                      {formatRuntime(movie.runtime)}
                    </span>
                  </div>
                  <GenreList genres={movie.genres} />
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <WatchlistToggleButton item={movie} />
                    </div>
                    <WatchlistFeedbackControls media={movie} compact />
                  </div>
                  <p className="max-w-3xl text-base leading-7 text-muted-foreground">
                    {movie.overview}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <CastSection cast={movie.cast} />
              <TrailerSection videos={movie.videos} />
              <SummaryPanel media={movie} />
              <AITitlePanel media={movie} />
              <WhereToWatchSection mediaType="movie" tmdbId={movie.tmdbId} />
              <HorizontalMediaRow
                section={{
                  id: "similar-movies",
                  title: "Ähnliche Filme",
                  subtitle: "Passende Anschlusskandidaten",
                  items: movie.similar
                }}
              />
            </div>
            <aside className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <StatPill
                  label="Bewertung"
                  value={`${movie.rating.toFixed(1)} / 10`}
                  icon={<Star className="size-4 text-amber-400" />}
                />
                <StatPill
                  label="Laufzeit"
                  value={formatRuntime(movie.runtime)}
                  icon={<Clock className="size-4" />}
                />
                <StatPill
                  label="Budget"
                  value={formatCurrency(movie.budget)}
                  icon={<DollarSign className="size-4" />}
                />
                <StatPill
                  label="Einspielergebnis"
                  value={formatCurrency(movie.revenue)}
                  icon={<DollarSign className="size-4" />}
                />
              </div>
              <div className="rounded-[2rem] border border-border/50 bg-card/50 p-5">
                <h2 className="mb-4 text-lg font-semibold">Details</h2>
                <InfoPanel
                  items={[
                    { label: "Status", value: movie.status },
                    { label: "Originaltitel", value: movie.originalTitle ?? "—" },
                    { label: "Veröffentlichung", value: formatDate(movie.releaseDate) },
                    { label: "Sprachen", value: movie.spokenLanguages.join(", ") || "—" }
                  ]}
                />
              </div>
            </aside>
          </div>
        </div>
      </AppShell>
    );
  } catch (error) {
    return (
      <AppShell>
        <ErrorState
          title="Filmdetails konnten nicht geladen werden"
          description={error instanceof Error ? error.message : "Unbekannter Fehler"}
        />
      </AppShell>
    );
  }
}
