import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { MediaGrid } from "@/components/sections/media-sections";
import { SectionHeader } from "@/components/shared/ui-components";
import { EmptyState, ErrorState } from "@/components/states/state-components";
import { Button } from "@/components/ui/button";
import { DiscoverControls } from "@/features/discover/discover-controls";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getDiscoverResults, getGenreMaps } from "@/lib/tmdb/discover";
import { DEFAULT_WATCH_REGION } from "@/lib/tmdb/watch-provider-preference";
import { getServerPreferredWatchRegion } from "@/lib/tmdb/watch-provider-preference.server";
import { getAvailableRegions } from "@/lib/tmdb/watch-providers";
import { searchParamsSchema } from "@/lib/validators/media";
import type { SearchSortDirection, SearchSortKey } from "@/features/search/search-sidebar-filters";
import type { WatchRegion } from "@/types/watch-providers";

type DiscoverPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveRegionCode(regionCode: string, availableRegions: WatchRegion[]) {
  const normalized = regionCode.toUpperCase();

  if (availableRegions.some(region => region.regionCode === normalized)) {
    return normalized;
  }

  return (
    availableRegions.find(region => region.regionCode === DEFAULT_WATCH_REGION)?.regionCode ??
    availableRegions[0]?.regionCode ??
    DEFAULT_WATCH_REGION
  );
}

function mapLegacyDiscoverSort(sort: string | undefined) {
  if (!sort) {
    return {
      sort: "popularity" as SearchSortKey,
      direction: "desc" as SearchSortDirection
    };
  }

  if (sort === "vote_average.desc") {
    return { sort: "rating" as SearchSortKey, direction: "desc" as SearchSortDirection };
  }

  if (sort === "vote_average.asc") {
    return { sort: "rating" as SearchSortKey, direction: "asc" as SearchSortDirection };
  }

  if (sort === "primary_release_date.desc" || sort === "first_air_date.desc") {
    return { sort: "release_date" as SearchSortKey, direction: "desc" as SearchSortDirection };
  }

  if (sort === "primary_release_date.asc" || sort === "first_air_date.asc") {
    return { sort: "release_date" as SearchSortKey, direction: "asc" as SearchSortDirection };
  }

  if (sort === "popularity.asc") {
    return { sort: "popularity" as SearchSortKey, direction: "asc" as SearchSortDirection };
  }

  return {
    sort: "popularity" as SearchSortKey,
    direction: "desc" as SearchSortDirection
  };
}

function mapSearchSortToDiscoverSort(
  mediaType: "movie" | "tv",
  sort: SearchSortKey,
  direction: SearchSortDirection
) {
  if (sort === "rating") {
    return `vote_average.${direction}`;
  }

  if (sort === "release_date") {
    return mediaType === "movie"
      ? `primary_release_date.${direction}`
      : `first_air_date.${direction}`;
  }

  return `popularity.${direction}`;
}

function buildDiscoverHref(input: {
  type: "movie" | "tv";
  sort: SearchSortKey;
  direction: SearchSortDirection;
  genre?: number;
  yearFrom?: number;
  yearTo?: number;
  rating?: number;
  page: number;
  region: string;
  providers: number[];
}) {
  const params = new URLSearchParams();
  params.set("type", input.type);
  params.set("sort", input.sort);
  params.set("direction", input.direction);
  params.set("page", String(input.page));
  params.set("region", input.region);

  if (input.genre) {
    params.set("genre", String(input.genre));
  }

  if (input.yearFrom) {
    params.set("yearFrom", String(input.yearFrom));
  }

  if (input.yearTo) {
    params.set("yearTo", String(input.yearTo));
  }

  if (input.rating !== undefined) {
    params.set("rating", String(input.rating));
  }

  for (const providerId of input.providers) {
    params.append("providers", String(providerId));
  }

  return `/discover?${params.toString()}`;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const { dictionary, locale } = await getServerDictionary();
  const rawSearchParams = await searchParams;
  const requestedRegion = await getServerPreferredWatchRegion(rawSearchParams.region);

  const legacySort = mapLegacyDiscoverSort(firstValue(rawSearchParams.sort));
  const parsedFilters = searchParamsSchema.parse({
    q: "",
    type: firstValue(rawSearchParams.type) ?? firstValue(rawSearchParams.mediaType),
    sort: firstValue(rawSearchParams.sort)?.includes(".")
      ? legacySort.sort
      : firstValue(rawSearchParams.sort),
    direction: firstValue(rawSearchParams.sort)?.includes(".")
      ? legacySort.direction
      : firstValue(rawSearchParams.direction),
    genre: rawSearchParams.genre,
    yearFrom: rawSearchParams.yearFrom,
    yearTo: rawSearchParams.yearTo,
    rating: rawSearchParams.rating,
    page: rawSearchParams.page,
    region: requestedRegion,
    providers: rawSearchParams.providers ?? rawSearchParams.provider
  });

  const mediaType = parsedFilters.type === "tv" ? "tv" : "movie";

  try {
    const [availableRegions, genreMaps] = await Promise.all([
      getAvailableRegions(),
      getGenreMaps(locale)
    ]);
    const activeRegion = resolveRegionCode(parsedFilters.region ?? requestedRegion, availableRegions);
    const discoverResult = await getDiscoverResults({
      mediaType,
      genre: parsedFilters.genre,
      yearFrom: parsedFilters.yearFrom,
      yearTo: parsedFilters.yearTo,
      rating: parsedFilters.rating,
      page: parsedFilters.page,
      sort: mapSearchSortToDiscoverSort(mediaType, parsedFilters.sort, parsedFilters.direction),
      region: activeRegion,
      providers: parsedFilters.providers,
      locale
    });
    const safeItems = await filterMediaForViewerAge(discoverResult.items);
    const mediaTypeGenres = mediaType === "movie" ? genreMaps.movieList : genreMaps.tvList;
    const selectedGenreName = parsedFilters.genre
      ? mediaTypeGenres.find(genre => genre.id === parsedFilters.genre)?.name
      : undefined;
    const activeRegionName =
      availableRegions.find(region => region.regionCode === activeRegion)?.regionName ??
      activeRegion;
    const totalPages = Math.max(1, Math.min(discoverResult.totalPages, 167));
    const visiblePages = getVisiblePages(discoverResult.page, totalPages);

    const text =
      locale === "en"
        ? {
            spotlightTitle: "Genre-based discovery",
            spotlightSubtitle:
              "Curated TMDB discover feed with the same filter system as search, focused on finding titles by category.",
            activeMediaType: mediaType === "movie" ? "Movies" : "Series",
            activeRegion: `Region: ${activeRegionName}`,
            activeGenre: selectedGenreName ? `Category: ${selectedGenreName}` : "Category: All",
            totalResults: `${discoverResult.totalResults.toLocaleString("en-US")} discover results`,
            discoverLabel: "Discover results",
            discoverSubtitle: `Page ${discoverResult.page} of ${totalPages}. This page shows up to 60 titles.`,
            page: "Page",
            of: "of",
            previous: "Previous",
            next: "Next",
            noResultsTitle: "No discover results for these filters",
            noResultsDescription:
              "Try another category, wider year range, lower minimum score or a different country."
          }
        : {
            spotlightTitle: "Genrebasierte Entdeckung",
            spotlightSubtitle:
              "Kuratiertes TMDB-Discover mit demselben Filtersystem wie in der Suche, fokussiert auf neue Titel nach Kategorie.",
            activeMediaType: mediaType === "movie" ? "Filme" : "Serien",
            activeRegion: `Land: ${activeRegionName}`,
            activeGenre: selectedGenreName ? `Kategorie: ${selectedGenreName}` : "Kategorie: Alle",
            totalResults: `${discoverResult.totalResults.toLocaleString("de-DE")} Discover-Treffer`,
            discoverLabel: "Discover-Ergebnisse",
            discoverSubtitle: `Seite ${discoverResult.page} von ${totalPages}. Diese Seite zeigt bis zu 60 Titel.`,
            page: "Seite",
            of: "von",
            previous: "Zurueck",
            next: "Weiter",
            noResultsTitle: "Keine Discover-Treffer fuer diese Filter",
            noResultsDescription:
              "Probiere eine andere Kategorie, einen groesseren Zeitraum, ein niedrigeres Mindest-Rating oder ein anderes Land."
          };

    return (
      <AppShell>
        <div className="space-y-8">
          <section className="rounded-[2rem] border border-border/50 bg-gradient-to-br from-card/90 via-card/60 to-background p-6 sm:p-8">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{text.spotlightTitle}</h1>
              <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                {text.spotlightSubtitle}
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/40 bg-background/40 px-4 py-3 text-sm">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {locale === "en" ? "Media type" : "Medientyp"}
                </span>
                <p className="mt-1 font-semibold">{text.activeMediaType}</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/40 px-4 py-3 text-sm">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {locale === "en" ? "Region" : "Land"}
                </span>
                <p className="mt-1 font-semibold">{text.activeRegion}</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/40 px-4 py-3 text-sm">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {locale === "en" ? "Category" : "Kategorie"}
                </span>
                <p className="mt-1 font-semibold">{text.activeGenre}</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-background/40 px-4 py-3 text-sm">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {locale === "en" ? "Scope" : "Umfang"}
                </span>
                <p className="mt-1 font-semibold">{text.totalResults}</p>
              </div>
            </div>
          </section>

          <div className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            <DiscoverControls
              movieGenres={genreMaps.movieList}
              tvGenres={genreMaps.tvList}
              availableRegions={availableRegions}
              initial={{
                query: "",
                type: mediaType,
                sort: parsedFilters.sort,
                direction: parsedFilters.direction,
                genre: parsedFilters.genre,
                yearFrom: parsedFilters.yearFrom,
                yearTo: parsedFilters.yearTo,
                rating: parsedFilters.rating,
                region: activeRegion,
                providers: parsedFilters.providers
              }}
            />

            <div className="space-y-4">
              <SectionHeader title={text.discoverLabel} subtitle={text.discoverSubtitle} />

              {safeItems.length ? (
                <MediaGrid items={safeItems} />
              ) : (
                <EmptyState title={text.noResultsTitle} description={text.noResultsDescription} />
              )}

              {totalPages > 1 ? (
                <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/50 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {text.page} {discoverResult.page} {text.of} {totalPages}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm" disabled={discoverResult.page <= 1}>
                      <Link
                        aria-disabled={discoverResult.page <= 1}
                        href={buildDiscoverHref({
                          type: mediaType,
                          sort: parsedFilters.sort,
                          direction: parsedFilters.direction,
                          genre: parsedFilters.genre,
                          yearFrom: parsedFilters.yearFrom,
                          yearTo: parsedFilters.yearTo,
                          rating: parsedFilters.rating,
                          page: Math.max(1, discoverResult.page - 1),
                          region: activeRegion,
                          providers: parsedFilters.providers
                        })}
                      >
                        {text.previous}
                      </Link>
                    </Button>
                    {visiblePages.map(page => (
                      <Button
                        key={page}
                        asChild
                        variant={page === discoverResult.page ? "default" : "outline"}
                        size="sm"
                      >
                        <Link
                          href={buildDiscoverHref({
                            type: mediaType,
                            sort: parsedFilters.sort,
                            direction: parsedFilters.direction,
                            genre: parsedFilters.genre,
                            yearFrom: parsedFilters.yearFrom,
                            yearTo: parsedFilters.yearTo,
                            rating: parsedFilters.rating,
                            page,
                            region: activeRegion,
                            providers: parsedFilters.providers
                          })}
                        >
                          {page}
                        </Link>
                      </Button>
                    ))}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      disabled={discoverResult.page >= totalPages}
                    >
                      <Link
                        aria-disabled={discoverResult.page >= totalPages}
                        href={buildDiscoverHref({
                          type: mediaType,
                          sort: parsedFilters.sort,
                          direction: parsedFilters.direction,
                          genre: parsedFilters.genre,
                          yearFrom: parsedFilters.yearFrom,
                          yearTo: parsedFilters.yearTo,
                          rating: parsedFilters.rating,
                          page: Math.min(totalPages, discoverResult.page + 1),
                          region: activeRegion,
                          providers: parsedFilters.providers
                        })}
                      >
                        {text.next}
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AppShell>
    );
  } catch (error) {
    return (
      <AppShell>
        <ErrorState
          title={dictionary.discoverPage.errorTitle}
          description={error instanceof Error ? error.message : dictionary.common.unknownError}
        />
      </AppShell>
    );
  }
}
