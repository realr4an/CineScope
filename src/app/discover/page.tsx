import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { MediaGrid } from "@/components/sections/media-sections";
import { SectionHeader } from "@/components/shared/ui-components";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states/state-components";
import { DiscoverFilters } from "@/features/discover/discover-filters";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getDiscoverResults, getGenreMaps } from "@/lib/tmdb/discover";
import { getServerPreferredWatchRegion } from "@/lib/tmdb/watch-provider-preference.server";
import { DEFAULT_WATCH_REGION } from "@/lib/tmdb/watch-provider-preference";
import { getAvailableRegions } from "@/lib/tmdb/watch-providers";
import { discoverParamsSchema } from "@/lib/validators/media";
import type { WatchRegion } from "@/types/watch-providers";

type DiscoverPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

function buildDiscoverHref(input: {
  mediaType: "movie" | "tv";
  genre?: number;
  yearFrom?: number;
  yearTo?: number;
  rating?: number;
  page: number;
  sort: string;
  region: string;
  providers: number[];
}) {
  const params = new URLSearchParams();
  params.set("mediaType", input.mediaType);
  params.set("sort", input.sort);
  params.set("page", String(input.page));
  params.set("region", input.region);
  if (input.genre) params.set("genre", String(input.genre));
  if (input.yearFrom) params.set("yearFrom", String(input.yearFrom));
  if (input.yearTo) params.set("yearTo", String(input.yearTo));
  if (input.rating !== undefined) params.set("rating", String(input.rating));
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
  const parsed = discoverParamsSchema.parse({
    mediaType: rawSearchParams.mediaType,
    genre: rawSearchParams.genre,
    yearFrom: rawSearchParams.yearFrom,
    yearTo: rawSearchParams.yearTo,
    rating: rawSearchParams.rating,
    page: rawSearchParams.page,
    sort: rawSearchParams.sort,
    region: requestedRegion,
    providers: rawSearchParams.providers ?? rawSearchParams.provider
  });

  try {
    const [availableRegions, genreMaps] = await Promise.all([
      getAvailableRegions(),
      getGenreMaps(locale)
    ]);
    const activeRegion = resolveRegionCode(parsed.region ?? requestedRegion, availableRegions);
    const result = await getDiscoverResults({ ...parsed, region: activeRegion, locale });
    const safeItems = await filterMediaForViewerAge(result.items);
    const totalPages = Math.max(1, Math.min(result.totalPages, 167));
    const visiblePages = getVisiblePages(result.page, totalPages);
    const paginationText =
      locale === "en"
        ? {
            page: "Page",
            of: "of",
            previous: "Previous",
            next: "Next",
            tmdbPageInfo: "This view combines up to 60 titles per page.",
            filteredInfo: "Streaming filters active.",
            resultsLabel: `${result.totalResults.toLocaleString("en-US")} results`
          }
        : {
            page: "Seite",
            of: "von",
            previous: "Zurück",
            next: "Weiter",
            tmdbPageInfo: "Diese Ansicht bündelt bis zu 60 Titel pro Seite.",
            filteredInfo: "Streaming-Filter aktiv.",
            resultsLabel: `${result.totalResults.toLocaleString("de-DE")} Treffer`
          };

    return (
      <AppShell>
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {dictionary.discoverPage.title}
            </h1>
            <p className="text-muted-foreground">{dictionary.discoverPage.description}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
            <DiscoverFilters
              movieGenres={genreMaps.movieList}
              tvGenres={genreMaps.tvList}
              regions={availableRegions}
              initial={{ ...parsed, region: activeRegion }}
            />

            <div className="space-y-4">
              <SectionHeader
                title={
                  parsed.mediaType === "movie"
                    ? dictionary.discoverPage.discoverMovies
                    : dictionary.discoverPage.discoverSeries
                }
                subtitle={`${paginationText.resultsLabel} · ${paginationText.page} ${result.page} ${paginationText.of} ${totalPages} · ${parsed.providers.length ? paginationText.filteredInfo : paginationText.tmdbPageInfo}`}
              />
              <MediaGrid items={safeItems} />

              {totalPages > 1 ? (
                <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/50 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {paginationText.page} {result.page} {paginationText.of} {totalPages}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm" disabled={result.page <= 1}>
                      <Link
                        aria-disabled={result.page <= 1}
                        href={buildDiscoverHref({ ...parsed, page: Math.max(1, result.page - 1), region: activeRegion })}
                      >
                        {paginationText.previous}
                      </Link>
                    </Button>
                    {visiblePages.map(page => (
                      <Button key={page} asChild variant={page === result.page ? "default" : "outline"} size="sm">
                        <Link href={buildDiscoverHref({ ...parsed, page, region: activeRegion })}>{page}</Link>
                      </Button>
                    ))}
                    <Button asChild variant="outline" size="sm" disabled={result.page >= totalPages}>
                      <Link
                        aria-disabled={result.page >= totalPages}
                        href={buildDiscoverHref({ ...parsed, page: Math.min(totalPages, result.page + 1), region: activeRegion })}
                      >
                        {paginationText.next}
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
