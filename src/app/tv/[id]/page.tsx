import Link from "next/link";
import { ArrowLeft, Calendar, Layers, ShieldAlert, Star, Tv } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CastSection, InfoPanel, TrailerSection } from "@/components/sections/detail-components";
import { HorizontalMediaRow } from "@/components/sections/media-sections";
import { GenreList, RatingBadge, StatPill } from "@/components/shared/ui-components";
import { ErrorState } from "@/components/states/state-components";
import { SummaryPanel } from "@/features/ai-chat/ai-panel";
import { AITitlePanel } from "@/features/ai/title-ai-panel";
import { WhereToWatchSection } from "@/features/watch-providers/where-to-watch-section";
import { WatchlistFeedbackControls } from "@/features/watchlist/watchlist-feedback-controls";
import { WatchlistToggleButton } from "@/features/watchlist/watchlist-toggle-button";
import { filterMediaForViewerAge, getAgeAccessForMedia } from "@/lib/age-gate/server";
import { formatDate, formatRuntime } from "@/lib/format";
import { getTvDetail } from "@/lib/tmdb/tv";

type TvPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TvPage({ params }: TvPageProps) {
  const { id } = await params;
  const tmdbId = Number(id);

  try {
    const [series, access] = await Promise.all([
      getTvDetail(tmdbId),
      getAgeAccessForMedia("tv", tmdbId)
    ]);

    if (!access.allowed) {
      return (
        <AppShell>
          <ErrorState
            title="Dieser Titel ist fÜr dein Alter gesperrt"
            description={`${series.title} ist aktuell mit ${access.certification?.label ?? "einer hoeheren Altersfreigabe"} gekennzeichnet und wird deshalb ausgeblendet.`}
            action={{ label: "Zur Startseite", href: "/" }}
          />
        </AppShell>
      );
    }

    const averageRuntime = series.episodeRuntime.length
      ? Math.round(
          series.episodeRuntime.reduce((sum, runtime) => sum + runtime, 0) /
            series.episodeRuntime.length
        )
      : null;
    const safeSimilar = await filterMediaForViewerAge(series.similar);

    return (
      <AppShell>
        <div className="min-w-0 space-y-8 sm:space-y-10">
          <section className="relative overflow-hidden rounded-[1.75rem] border border-border/50 sm:rounded-[2rem]">
            <img
              src={series.backdropUrl ?? series.posterUrl ?? ""}
              alt={series.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="relative z-10 min-h-[56vh] p-5 sm:min-h-[60vh] sm:p-8 lg:p-12">
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Zur Startseite
              </Link>
              <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-end lg:gap-8">
                <div className="hidden overflow-hidden rounded-3xl border border-border/50 shadow-2xl shadow-black/40 lg:block">
                  <img src={series.posterUrl ?? ""} alt={series.title} className="w-full" />
                </div>
                <div className="min-w-0 space-y-5">
                  <div className="space-y-2">
                    <div className="inline-flex rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      Serie
                    </div>
                    <h1 className="break-words text-4xl font-bold tracking-tight sm:text-5xl">{series.title}</h1>
                    {series.tagline ? (
                      <p className="text-lg italic text-muted-foreground">&quot;{series.tagline}&quot;</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <RatingBadge rating={series.rating} voteCount={series.voteCount} />
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="size-4" />
                      {formatDate(series.firstAirDate)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <Layers className="size-4" />
                      {series.numberOfSeasons} Staffeln
                    </span>
                    {series.ageCertification?.label ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-sm text-muted-foreground">
                        <ShieldAlert className="size-4" />
                        {series.ageCertification.label}
                      </span>
                    ) : null}
                  </div>
                  <GenreList genres={series.genres} />
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <WatchlistToggleButton item={series} />
                    </div>
                    <WatchlistFeedbackControls media={series} compact />
                  </div>
                  <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                    {series.overview}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-8">
              <CastSection cast={series.cast} />
              <TrailerSection videos={series.videos} />
              <SummaryPanel media={series} />
              <AITitlePanel media={series} />
              <WhereToWatchSection mediaType="tv" tmdbId={series.tmdbId} />
              <HorizontalMediaRow
                section={{
                  id: "similar-tv",
                  title: "Ähnliche Serien",
                  subtitle: "Mehr aus derselben Zielgruppe",
                  items: safeSimilar
                }}
              />
            </div>
            <aside className="min-w-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <StatPill
                  label="Bewertung"
                  value={`${series.rating.toFixed(1)} / 10`}
                  icon={<Star className="size-4 text-amber-400" />}
                />
                <StatPill
                  label="Staffeln"
                  value={series.numberOfSeasons}
                  icon={<Layers className="size-4" />}
                />
                <StatPill
                  label="Episoden"
                  value={series.numberOfEpisodes}
                  icon={<Tv className="size-4" />}
                />
                <StatPill
                  label="Durchschnitts-Laufzeit"
                  value={formatRuntime(averageRuntime)}
                  icon={<Calendar className="size-4" />}
                />
              </div>
              <div className="rounded-[2rem] border border-border/50 bg-card/50 p-5">
                <h2 className="mb-4 text-lg font-semibold">Details</h2>
                <InfoPanel
                  items={[
                    { label: "Status", value: series.status },
                    { label: "Originaltitel", value: series.originalTitle ?? "-" },
                    { label: "Erstausstrahlung", value: formatDate(series.firstAirDate) },
                    { label: "Originalsprache", value: series.originalLanguage ?? "-" },
                    { label: "Altersfreigabe", value: series.ageCertification?.label ?? "Nicht hinterlegt" },
                    { label: "Sprachen", value: series.spokenLanguages.join(", ") || series.originalLanguage || "-" },
                    { label: "Netzwerke", value: series.networks.join(", ") || "-" }
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
          title="Seriendetails konnten nicht geladen werden"
          description={error instanceof Error ? error.message : "Unbekannter Fehler"}
        />
      </AppShell>
    );
  }
}
