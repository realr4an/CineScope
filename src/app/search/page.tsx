import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { MediaGrid } from "@/components/sections/media-sections";
import { SectionHeader } from "@/components/shared/ui-components";
import { EmptyState, ErrorState } from "@/components/states/state-components";
import { Button } from "@/components/ui/button";
import { SearchControls } from "@/features/search/search-controls";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getDiscoverResults, getGenreMaps } from "@/lib/tmdb/discover";
import { searchMediaWithFallback } from "@/lib/tmdb/search";
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

type SearchSortKey = "popularity" | "rating" | "release_date";
type SearchSortDirection = "asc" | "desc";

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
  if (input.q.trim()) {
    params.set("q", input.q.trim());
  }
  params.set("type", input.type);
  params.set("sort", input.sort);
  params.set("direction", input.direction);
  params.set("page", String(input.page));
  params.set("region", input.region);
  if (input.type !== "all" && input.genre) {
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
  return `/search?${params.toString()}`;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function interleaveItems(movieItems: MediaListItem[], tvItems: MediaListItem[]) {
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

  return items.slice(0, 60);
}

function filterSearchItems(
  items: MediaListItem[],
  input: {
    genre?: number;
    yearFrom?: number;
    yearTo?: number;
    rating?: number;
  }
) {
  const effectiveYearTo = input.yearTo ?? input.yearFrom;

  return items.filter(item => {
    if (input.genre && !item.genres.some(genre => genre.id === input.genre)) {
      return false;
    }

    if (input.rating !== undefined && item.rating < input.rating) {
      return false;
    }

    if (input.yearFrom || effectiveYearTo) {
      const year = item.releaseDate ? Number(item.releaseDate.slice(0, 4)) : undefined;

      if (!year) {
        return false;
      }

      if (input.yearFrom && year < input.yearFrom) {
        return false;
      }

      if (effectiveYearTo && year > effectiveYearTo) {
        return false;
      }
    }

    return true;
  });
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

async function getBrowseResults(input: {
  type: "all" | "movie" | "tv";
  page: number;
  genre?: number;
  yearFrom?: number;
  yearTo?: number;
  rating?: number;
  sort: SearchSortKey;
  direction: SearchSortDirection;
  region: string;
  providers: number[];
  locale: "de" | "en";
}) {
  if (input.type === "movie" || input.type === "tv") {
    return getDiscoverResults({
      mediaType: input.type,
      genre: input.genre,
      yearFrom: input.yearFrom,
      yearTo: input.yearTo,
      rating: input.rating,
      page: input.page,
      sort: mapSearchSortToDiscoverSort(input.type, input.sort, input.direction),
      region: input.region,
      providers: input.providers,
      locale: input.locale
    });
  }

  const [movieResults, tvResults] = await Promise.all([
    getDiscoverResults({
      mediaType: "movie",
      yearFrom: input.yearFrom,
      yearTo: input.yearTo,
      rating: input.rating,
      page: input.page,
      sort: mapSearchSortToDiscoverSort("movie", input.sort, input.direction),
      region: input.region,
      providers: input.providers,
      locale: input.locale
    }),
    getDiscoverResults({
      mediaType: "tv",
      yearFrom: input.yearFrom,
      yearTo: input.yearTo,
      rating: input.rating,
      page: input.page,
      sort: mapSearchSortToDiscoverSort("tv", input.sort, input.direction),
      region: input.region,
      providers: input.providers,
      locale: input.locale
    })
  ]);

  return {
    items: interleaveItems(movieResults.items.slice(0, 30), tvResults.items.slice(0, 30)),
    page: input.page,
    totalPages: Math.max(1, Math.max(movieResults.totalPages, tvResults.totalPages)),
    totalResults: movieResults.totalResults + tvResults.totalResults
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
    direction: rawSearchParams.direction,
    genre: rawSearchParams.genre,
    yearFrom: rawSearchParams.yearFrom,
    yearTo: rawSearchParams.yearTo,
    rating: rawSearchParams.rating,
    page: rawSearchParams.page,
    region: requestedRegion,
    providers: rawSearchParams.providers ?? rawSearchParams.provider
  });

  try {
    const [availableRegions, genreMaps] = await Promise.all([
      getAvailableRegions(),
      getGenreMaps(locale)
    ]);
    const activeRegion = resolveRegionCode(parsed.region ?? requestedRegion, availableRegions);
    const searchResult = parsed.q
      ? await searchMediaWithFallback({
          query: parsed.q,
          mediaType: parsed.type,
          page: parsed.page,
          locale
        })
      : {
          items: [],
          appliedQuery: parsed.q,
          fallbackUsed: false,
          page: parsed.page,
          totalPages: 1,
          totalResults: 0
        };

    const filteredSearchItems = filterSearchItems(searchResult.items, {
      genre: parsed.type === "all" ? undefined : parsed.genre,
      yearFrom: parsed.yearFrom,
      yearTo: parsed.yearTo,
      rating: parsed.rating
    });
    const providerFilteredResults = parsed.providers.length
      ? await filterMediaByWatchProvider(filteredSearchItems, activeRegion, parsed.providers)
      : filteredSearchItems;
    const safeResults = await filterMediaForViewerAge(providerFilteredResults);

    const sortedResults = [...safeResults].sort((left, right) => {
      const directionMultiplier = parsed.direction === "asc" ? 1 : -1;

      if (parsed.sort === "rating") {
        return (left.rating - right.rating) * directionMultiplier;
      }

      if (parsed.sort === "release_date") {
        return (left.releaseDate ?? "").localeCompare(right.releaseDate ?? "") * directionMultiplier;
      }

      return (left.voteCount - right.voteCount) * directionMultiplier;
    });

    const browseResult =
      parsed.q.trim().length === 0
        ? await getBrowseResults({
            type: parsed.type,
            page: parsed.page,
            genre: parsed.type === "all" ? undefined : parsed.genre,
            yearFrom: parsed.yearFrom,
            yearTo: parsed.yearTo,
            rating: parsed.rating,
            sort: parsed.sort,
            direction: parsed.direction,
            region: activeRegion,
            providers: parsed.providers,
            locale
          })
        : { items: [], page: 1, totalPages: 1, totalResults: 0 };
    const discoveryItems =
      parsed.q.trim().length === 0
        ? await filterMediaForViewerAge(
            filterSearchItems(browseResult.items, {
              genre: parsed.type === "all" ? undefined : parsed.genre,
              yearFrom: parsed.yearFrom,
              yearTo: parsed.yearTo,
              rating: parsed.rating
            })
          )
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
          browseInfo: "Browse results, up to 60 titles per page.",
          filteredInfo: "Streaming filters applied to the current page.",
          browseTitle: "Browse results",
          browseSubtitle: "Use filters on the left or type a title to search directly.",
          filteredResults: `${sortedResults.length.toLocaleString("en-US")} filtered results on this page`
        }
      : {
          page: "Seite",
          of: "von",
          previous: "Zurück",
          next: "Weiter",
          pageInfo: "Diese Ansicht bündelt bis zu 60 Titel pro Seite.",
          browseInfo: "Gefilterte Ergebnisse, bis zu 60 Titel pro Seite.",
          filteredInfo: "Streaming-Filter auf diese Seite angewendet.",
          browseTitle: "Stöbern und filtern",
          browseSubtitle: "Nutze links die Filter oder suche direkt nach einem Titel.",
          filteredResults: `${sortedResults.length.toLocaleString("de-DE")} gefilterte Treffer auf dieser Seite`
        };
    const resultsLabel = parsed.providers.length
      ? pageText.filteredResults
      : isEnglish
        ? `${searchResult.totalResults.toLocaleString("en-US")} results`
        : `${searchResult.totalResults.toLocaleString("de-DE")} Treffer`;
    const browseVisiblePages = getVisiblePages(browseResult.page, browseResult.totalPages);

    return (
      <AppShell>
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {dictionary.searchPage.title}
            </h1>
            <p className="text-muted-foreground">{dictionary.searchPage.description}</p>
          </div>

          <SearchControls
            movieGenres={genreMaps.movieList}
            tvGenres={genreMaps.tvList}
            availableRegions={availableRegions}
            initial={{
              query: parsed.q,
              type: parsed.type,
              sort: parsed.sort,
              direction: parsed.direction,
              genre: parsed.genre,
              yearFrom: parsed.yearFrom,
              yearTo: parsed.yearTo,
              rating: parsed.rating,
              region: activeRegion,
              providers: parsed.providers
            }}
          >
              {parsed.q ? (
                sortedResults.length ? (
                  <>
                    <SectionHeader
                      title={resultsLabel}
                      subtitle={`${dictionary.searchPage.matchesFor} "${searchResult.appliedQuery}" · ${pageText.page} ${searchResult.page} ${pageText.of} ${totalPages} · ${parsed.providers.length ? pageText.filteredInfo : pageText.pageInfo}`}
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
                              href={buildSearchHref({
                                ...parsed,
                                page: Math.max(1, searchResult.page - 1),
                                region: activeRegion
                              })}
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
                              href={buildSearchHref({
                                ...parsed,
                                page: Math.min(totalPages, searchResult.page + 1),
                                region: activeRegion
                              })}
                            >
                              {pageText.next}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
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
                <>
                  <SectionHeader
                    title={pageText.browseTitle}
                    subtitle={`${pageText.browseSubtitle} · ${pageText.page} ${browseResult.page} ${pageText.of} ${browseResult.totalPages} · ${parsed.providers.length ? pageText.filteredInfo : pageText.browseInfo}`}
                  />
                  <MediaGrid items={discoveryItems} />
                  {browseResult.totalPages > 1 ? (
                    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/50 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground">
                        {pageText.page} {browseResult.page} {pageText.of} {browseResult.totalPages}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline" size="sm" disabled={browseResult.page <= 1}>
                          <Link
                            aria-disabled={browseResult.page <= 1}
                            href={buildSearchHref({
                              ...parsed,
                              page: Math.max(1, browseResult.page - 1),
                              region: activeRegion
                            })}
                          >
                            {pageText.previous}
                          </Link>
                        </Button>
                        {browseVisiblePages.map(page => (
                          <Button key={page} asChild variant={page === browseResult.page ? "default" : "outline"} size="sm">
                            <Link href={buildSearchHref({ ...parsed, page, region: activeRegion })}>{page}</Link>
                          </Button>
                        ))}
                        <Button asChild variant="outline" size="sm" disabled={browseResult.page >= browseResult.totalPages}>
                          <Link
                            aria-disabled={browseResult.page >= browseResult.totalPages}
                            href={buildSearchHref({
                              ...parsed,
                              page: Math.min(browseResult.totalPages, browseResult.page + 1),
                              region: activeRegion
                            })}
                          >
                            {pageText.next}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
          </SearchControls>
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
