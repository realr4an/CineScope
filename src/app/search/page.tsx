import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { MediaGrid } from "@/components/sections/media-sections";
import { SectionHeader } from "@/components/shared/ui-components";
import { EmptyState, ErrorState } from "@/components/states/state-components";
import { Button } from "@/components/ui/button";
import { SearchForm } from "@/features/search/search-form";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getDiscoverResults } from "@/lib/tmdb/discover";
import { getPopularMovies } from "@/lib/tmdb/movies";
import { searchMediaWithFallback } from "@/lib/tmdb/search";
import { getPopularTv } from "@/lib/tmdb/tv";
import { getServerPreferredWatchRegion } from "@/lib/tmdb/watch-provider-preference.server";
import { DEFAULT_WATCH_REGION } from "@/lib/tmdb/watch-provider-preference";
import {
  filterMediaByWatchProvider,
  getAvailableRegions
} from "@/lib/tmdb/watch-providers";
import { searchParamsSchema } from "@/lib/validators/media";
import type { MediaListItem } from "@/types/media";
import type { WatchRegion } from "@/types/watch-providers";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const POPULAR_PAGE_SIZE = 60;
const TMDB_PAGE_SIZE = 20;
const FEED_PAGE_COUNT = POPULAR_PAGE_SIZE / TMDB_PAGE_SIZE;
const FEED_SPLIT_SIZE = POPULAR_PAGE_SIZE / 2;

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

function buildSearchHref(input: {
  q: string;
  type: "all" | "movie" | "tv";
  sort: "popularity" | "rating" | "release_date";
  page: number;
  region: string;
  provider?: number;
}) {
  const params = new URLSearchParams();
  if (input.q.trim()) {
    params.set("q", input.q.trim());
  }
  params.set("type", input.type);
  params.set("sort", input.sort);
  params.set("page", String(input.page));
  params.set("region", input.region);
  if (input.provider) {
    params.set("provider", String(input.provider));
  }
  return `/search?${params.toString()}`;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function interleavePopularItems(movieItems: MediaListItem[], tvItems: MediaListItem[]) {
  const items: MediaListItem[] = [];
  const maxLength = Math.max(movieItems.length, tvItems.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (movieItems[index]) {
      items.push(movieItems[index]);
    }
    if (tvItems[index]) {
      items.push(tvItems[index]);
    }
  }

  return items.slice(0, POPULAR_PAGE_SIZE);
}

async function getPopularStartingPoints(page: number, locale: "de" | "en") {
  const requestedPage = Math.max(1, page);
  const movieStartPage = (requestedPage - 1) * FEED_PAGE_COUNT + 1;
  const tvStartPage = (requestedPage - 1) * FEED_PAGE_COUNT + 1;
  const moviePages = Array.from({ length: FEED_PAGE_COUNT }, (_, index) => movieStartPage + index);
  const tvPages = Array.from({ length: FEED_PAGE_COUNT }, (_, index) => tvStartPage + index);

  const [movieResponses, tvResponses] = await Promise.all([
    Promise.all(moviePages.map(currentPage => getPopularMovies(currentPage, locale))),
    Promise.all(tvPages.map(currentPage => getPopularTv(currentPage, locale)))
  ]);

  const movieItems = movieResponses.flatMap(response => response.items).slice(0, FEED_SPLIT_SIZE);
  const tvItems = tvResponses.flatMap(response => response.items).slice(0, FEED_SPLIT_SIZE);
  const totalMoviePages = Math.ceil(
    Math.min(movieResponses[0]?.totalResults ?? 0, 500 * TMDB_PAGE_SIZE) / FEED_SPLIT_SIZE
  );
  const totalTvPages = Math.ceil(
    Math.min(tvResponses[0]?.totalResults ?? 0, 500 * TMDB_PAGE_SIZE) / FEED_SPLIT_SIZE
  );

  return {
    items: interleavePopularItems(movieItems, tvItems),
    page: requestedPage,
    totalPages: Math.max(1, Math.min(totalMoviePages, totalTvPages, 334))
  };
}

async function getProviderStartingPoints(input: {
  page: number;
  region: string;
  provider: number;
  locale: "de" | "en";
}) {
  const [movieResults, tvResults] = await Promise.all([
    getDiscoverResults({
      mediaType: "movie",
      page: input.page,
      sort: "popularity.desc",
      region: input.region,
      provider: input.provider,
      locale: input.locale
    }),
    getDiscoverResults({
      mediaType: "tv",
      page: input.page,
      sort: "popularity.desc",
      region: input.region,
      provider: input.provider,
      locale: input.locale
    })
  ]);

  return {
    items: interleavePopularItems(movieResults.items.slice(0, FEED_SPLIT_SIZE), tvResults.items.slice(0, FEED_SPLIT_SIZE)),
    page: input.page,
    totalPages: Math.max(1, Math.max(movieResults.totalPages, tvResults.totalPages))
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { dictionary, locale } = await getServerDictionary();
  const rawSearchParams = await searchParams;
  const requestedRegion = await getServerPreferredWatchRegion(rawSearchParams.region);
  const parsed = searchParamsSchema.parse({
    q: rawSearchParams.q,
    type: rawSearchParams.type,
    sort: rawSearchParams.sort,
    page: rawSearchParams.page,
    region: requestedRegion,
    provider: rawSearchParams.provider
  });

  try {
    const availableRegions = await getAvailableRegions();
    const activeRegion = resolveRegionCode(parsed.region ?? requestedRegion, availableRegions);
    const searchResult = parsed.q
      ? await searchMediaWithFallback({
          query: parsed.q,
          mediaType: parsed.type,
          page: parsed.page,
          locale
        })
      : { items: [], appliedQuery: parsed.q, fallbackUsed: false, page: parsed.page, totalPages: 1, totalResults: 0 };

    const providerFilteredResults = parsed.provider
      ? await filterMediaByWatchProvider(searchResult.items, activeRegion, parsed.provider)
      : searchResult.items;
    const safeResults = await filterMediaForViewerAge(providerFilteredResults);

    const sortedResults = [...safeResults].sort((left, right) => {
      if (parsed.sort === "rating") {
        return right.rating - left.rating;
      }

      if (parsed.sort === "release_date") {
        return (right.releaseDate ?? "").localeCompare(left.releaseDate ?? "");
      }

      return right.voteCount - left.voteCount;
    });

    const popularStartingPoints =
      parsed.q.trim().length === 0
        ? parsed.provider
          ? await getProviderStartingPoints({
              page: parsed.page,
              region: activeRegion,
              provider: parsed.provider,
              locale
            })
          : await getPopularStartingPoints(parsed.page, locale)
        : { items: [], page: 1, totalPages: 1 };
    const discoveryItems =
      parsed.q.trim().length === 0
        ? await filterMediaForViewerAge(popularStartingPoints.items)
        : [];

    const isEnglish = locale === "en";
    const totalPages = Math.max(1, Math.min(searchResult.totalPages, 167));
    const visiblePages = getVisiblePages(searchResult.page, totalPages);
    const pageText = isEnglish
      ? {
          page: "Page",
          of: "of",
          previous: "Previous",
          next: "Next",
          pageInfo: "This view combines up to 60 titles per page.",
          popularInfo: "Popular starting points, 60 titles per page.",
          filteredInfo: "Streaming-service filter applied to the current page.",
          filteredResults: `${sortedResults.length.toLocaleString("en-US")} filtered results on this page`
        }
      : {
          page: "Seite",
          of: "von",
          previous: "Zurück",
          next: "Weiter",
          pageInfo: "Diese Ansicht bündelt bis zu 60 Titel pro Seite.",
          popularInfo: "Beliebte Einstiege, 60 Titel pro Seite.",
          filteredInfo: "Streamingdienst-Filter auf diese Seite angewendet.",
          filteredResults: `${sortedResults.length.toLocaleString("de-DE")} gefilterte Treffer auf dieser Seite`
        };
    const resultsLabel = parsed.provider
      ? pageText.filteredResults
      : isEnglish
        ? `${searchResult.totalResults.toLocaleString("en-US")} results`
        : `${searchResult.totalResults.toLocaleString("de-DE")} Treffer`;
    const popularVisiblePages = getVisiblePages(popularStartingPoints.page, popularStartingPoints.totalPages);

    return (
      <AppShell>
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {dictionary.searchPage.title}
            </h1>
            <p className="text-muted-foreground">{dictionary.searchPage.description}</p>
          </div>

          <SearchForm
            initialQuery={parsed.q}
            initialType={parsed.type}
            initialSort={parsed.sort}
            initialRegion={activeRegion}
            initialProvider={parsed.provider}
            availableRegions={availableRegions}
          />

          {parsed.q ? (
            sortedResults.length ? (
              <div className="space-y-4">
                <SectionHeader
                  title={resultsLabel}
                  subtitle={`${dictionary.searchPage.matchesFor} "${searchResult.appliedQuery}" · ${pageText.page} ${searchResult.page} ${pageText.of} ${totalPages} · ${parsed.provider ? pageText.filteredInfo : pageText.pageInfo}`}
                />
                {searchResult.fallbackUsed ? (
                  <p className="text-sm text-muted-foreground">
                    {isEnglish
                      ? `Showing corrected results for "${searchResult.appliedQuery}" based on your input "${parsed.q}".`
                      : `Zeige korrigierte Ergebnisse für "${searchResult.appliedQuery}" auf Basis deiner Eingabe "${parsed.q}".`}
                  </p>
                ) : null}
                <MediaGrid items={sortedResults} />
                {totalPages > 1 ? (
                  <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/50 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                      {pageText.page} {searchResult.page} {pageText.of} {totalPages}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button asChild variant="outline" size="sm" disabled={searchResult.page <= 1}>
                        <Link
                          aria-disabled={searchResult.page <= 1}
                          href={buildSearchHref({ ...parsed, page: Math.max(1, searchResult.page - 1), region: activeRegion })}
                        >
                          {pageText.previous}
                        </Link>
                      </Button>
                      {visiblePages.map(page => (
                        <Button key={page} asChild variant={page === searchResult.page ? "default" : "outline"} size="sm">
                          <Link href={buildSearchHref({ ...parsed, page, region: activeRegion })}>{page}</Link>
                        </Button>
                      ))}
                      <Button asChild variant="outline" size="sm" disabled={searchResult.page >= totalPages}>
                        <Link
                          aria-disabled={searchResult.page >= totalPages}
                          href={buildSearchHref({ ...parsed, page: Math.min(totalPages, searchResult.page + 1), region: activeRegion })}
                        >
                          {pageText.next}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState
                title={dictionary.searchPage.title === "Search" ? "No matches found" : "Keine Treffer gefunden"}
                description={
                  dictionary.searchPage.title === "Search"
                    ? `No matching movies or series were found for "${parsed.q}".`
                    : `Für "${parsed.q}" wurden keine passenden Filme oder Serien gefunden.`
                }
              />
            )
          ) : (
            <div className="space-y-4">
              <SectionHeader
                title={dictionary.searchPage.discoverTitle}
                subtitle={`${dictionary.searchPage.discoverSubtitle} · ${pageText.page} ${popularStartingPoints.page} ${pageText.of} ${popularStartingPoints.totalPages} · ${parsed.provider ? pageText.filteredInfo : pageText.popularInfo}`}
              />
              <MediaGrid items={discoveryItems} />
              {popularStartingPoints.totalPages > 1 ? (
                <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/50 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {pageText.page} {popularStartingPoints.page} {pageText.of} {popularStartingPoints.totalPages}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm" disabled={popularStartingPoints.page <= 1}>
                      <Link
                        aria-disabled={popularStartingPoints.page <= 1}
                        href={buildSearchHref({ ...parsed, page: Math.max(1, popularStartingPoints.page - 1), region: activeRegion })}
                      >
                        {pageText.previous}
                      </Link>
                    </Button>
                    {popularVisiblePages.map(page => (
                      <Button key={page} asChild variant={page === popularStartingPoints.page ? "default" : "outline"} size="sm">
                        <Link href={buildSearchHref({ ...parsed, page, region: activeRegion })}>{page}</Link>
                      </Button>
                    ))}
                    <Button asChild variant="outline" size="sm" disabled={popularStartingPoints.page >= popularStartingPoints.totalPages}>
                      <Link
                        aria-disabled={popularStartingPoints.page >= popularStartingPoints.totalPages}
                        href={buildSearchHref({ ...parsed, page: Math.min(popularStartingPoints.totalPages, popularStartingPoints.page + 1), region: activeRegion })}
                      >
                        {pageText.next}
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </AppShell>
    );
  } catch (error) {
    return (
      <AppShell>
        <ErrorState
          title={dictionary.searchPage.errorTitle}
          description={error instanceof Error ? error.message : dictionary.common.unknownError}
        />
      </AppShell>
    );
  }
}
