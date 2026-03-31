import Link from "next/link";
import { ArrowLeft, Calendar, Layers, ShieldAlert, Star, Tv } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CastSection, InfoPanel, TrailerSection } from "@/components/sections/detail-components";
import { HorizontalMediaRow } from "@/components/sections/media-sections";
import { GenreList, RatingBadge, StatPill } from "@/components/shared/ui-components";
import { ErrorState } from "@/components/states/state-components";
import { AITagList } from "@/features/ai/ai-primitives";
import { AITitlePanel } from "@/features/ai/title-ai-panel";
import { WhereToWatchSection } from "@/features/watch-providers/where-to-watch-section";
import { WatchlistFeedbackControls } from "@/features/watchlist/watchlist-feedback-controls";
import { WatchlistToggleButton } from "@/features/watchlist/watchlist-toggle-button";
import { filterMediaForViewerAge, getAgeAccessForMedia } from "@/lib/age-gate/server";
import { getInitialDetailAI } from "@/lib/ai/detail-content";
import { formatDate, formatDetailedRating, formatRuntime } from "@/lib/format";
import { getServerDictionary } from "@/lib/i18n/server";
import { getTvDetail } from "@/lib/tmdb/tv";
import { getServerPreferredWatchRegion } from "@/lib/tmdb/watch-provider-preference.server";

type TvPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TvPage({ params }: TvPageProps) {
  const { dictionary, locale } = await getServerDictionary();
  const { id } = await params;
  const tmdbId = Number(id);

  try {
    const [series, access, preferredRegion] = await Promise.all([
      getTvDetail(tmdbId, locale),
      getAgeAccessForMedia("tv", tmdbId),
      getServerPreferredWatchRegion()
    ]);

    if (!access.allowed) {
      return (
        <AppShell>
          <ErrorState
            title={dictionary.detail.titleBlocked}
            description={`${series.title} ${dictionary.detail.blockedDescriptionMiddle} ${access.certification?.label ?? dictionary.detail.blockedHigherRating} ${dictionary.detail.blockedDescriptionEnd}`}
            action={{ label: dictionary.detail.backHome, href: "/" }}
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

    const [safeSimilar, initialAI] = await Promise.all([
      filterMediaForViewerAge(series.similar),
      getInitialDetailAI(series, locale)
    ]);
    const summaryText = initialAI.summary ?? series.overview;

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
                {dictionary.detail.backHome}
              </Link>
              <div className="grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-end lg:gap-8">
                <div className="hidden overflow-hidden rounded-3xl border border-border/50 shadow-2xl shadow-black/40 lg:block">
                  <img src={series.posterUrl ?? ""} alt={series.title} className="w-full" />
                </div>
                <div className="min-w-0 space-y-5">
                  <div className="space-y-2">
                    <div className="inline-flex rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      {dictionary.common.tv}
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
                      {series.numberOfSeasons} {dictionary.detail.seasons}
                    </span>
                    {series.ageCertification?.label ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-sm text-muted-foreground">
                        <ShieldAlert className="size-4" />
                        {series.ageCertification.label}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    <GenreList genres={series.genres} />
                    {initialAI.insights?.vibeTags?.length ? (
                      <AITagList tags={initialAI.insights.vibeTags} showGeneratedLabel />
                    ) : null}
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <WatchlistToggleButton item={series} />
                    </div>
                    <WatchlistFeedbackControls media={series} compact />
                  </div>
                  <div className="max-w-3xl space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {locale === "en" ? "Quick take" : "Kurzüberblick"}
                    </div>
                    <p className="text-sm leading-7 text-muted-foreground sm:text-base">{summaryText}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-8">
              <CastSection cast={series.cast} />
              <TrailerSection videos={series.videos} />
              <AITitlePanel
                media={series}
                initialInsights={initialAI.insights}
                initialFit={initialAI.fit}
                hasProfileSignals={initialAI.hasFeedbackSignals}
              />
              <WhereToWatchSection
                mediaType="tv"
                tmdbId={series.tmdbId}
                initialRegionCode={preferredRegion}
              />
              <HorizontalMediaRow
                section={{
                  id: "similar-tv",
                  title: dictionary.detail.similarSeries,
                  subtitle: dictionary.detail.similarSeriesSubtitle,
                  items: safeSimilar
                }}
              />
            </div>
            <aside className="min-w-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <StatPill
                  label={dictionary.detail.rating}
                  value={formatDetailedRating(series.rating, series.voteCount)}
                  icon={<Star className="size-4 text-amber-400" />}
                />
                <StatPill
                  label={dictionary.detail.seasons}
                  value={series.numberOfSeasons}
                  icon={<Layers className="size-4" />}
                />
                <StatPill
                  label={dictionary.detail.episodes}
                  value={series.numberOfEpisodes}
                  icon={<Tv className="size-4" />}
                />
                <StatPill
                  label={dictionary.detail.averageRuntime}
                  value={formatRuntime(averageRuntime)}
                  icon={<Calendar className="size-4" />}
                />
              </div>
              <div className="rounded-[2rem] border border-border/50 bg-card/50 p-5">
                <h2 className="mb-4 text-lg font-semibold">{dictionary.detail.details}</h2>
                <InfoPanel
                  items={[
                    { label: dictionary.detail.status, value: series.status },
                    { label: dictionary.detail.originalTitle, value: series.originalTitle ?? "-" },
                    { label: dictionary.detail.firstAirDate, value: formatDate(series.firstAirDate) },
                    { label: dictionary.detail.originalLanguage, value: series.originalLanguage ?? "-" },
                    { label: dictionary.detail.ageRating, value: series.ageCertification?.label ?? dictionary.detail.notAvailable },
                    { label: dictionary.detail.languages, value: series.spokenLanguages.join(", ") || series.originalLanguage || "-" },
                    { label: dictionary.detail.networks, value: series.networks.join(", ") || "-" }
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
          title={dictionary.common.tv === "TV series" ? "Could not load series details" : "Seriendetails konnten nicht geladen werden"}
          description={error instanceof Error ? error.message : dictionary.common.unknownError}
        />
      </AppShell>
    );
  }
}

