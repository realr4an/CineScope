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
import { discoverParamsSchema } from "@/lib/validators/media";

type DiscoverPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildDiscoverHref(input: {
  mediaType: "movie" | "tv";
  genre?: number;
  year?: number;
  rating?: number;
  page: number;
  sort: string;
}) {
  const params = new URLSearchParams();
  params.set("mediaType", input.mediaType);
  params.set("sort", input.sort);
  params.set("page", String(input.page));
  if (input.genre) params.set("genre", String(input.genre));
  if (input.year) params.set("year", String(input.year));
  if (input.rating) params.set("rating", String(input.rating));
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
  const parsed = discoverParamsSchema.parse({
    mediaType: rawSearchParams.mediaType,
    genre: rawSearchParams.genre,
    year: rawSearchParams.year,
    rating: rawSearchParams.rating,
    page: rawSearchParams.page,
    sort: rawSearchParams.sort
  });

  try {
    const [{ movieList, tvList }, result] = await Promise.all([
      getGenreMaps(),
      getDiscoverResults(parsed)
    ]);
    const safeItems = await filterMediaForViewerAge(result.items);
    const totalPages = Math.max(1, Math.min(result.totalPages, 500));
    const visiblePages = getVisiblePages(result.page, totalPages);
    const paginationText =
      locale === "en"
        ? {
            page: "Page",
            of: "of",
            previous: "Previous",
            next: "Next",
            tmdbPageInfo: `TMDB returns 20 titles per page.`,
            resultsLabel: `${result.totalResults.toLocaleString("en-US")} results`
          }
        : {
            page: "Seite",
            of: "von",
            previous: "Zurück",
            next: "Weiter",
            tmdbPageInfo: "TMDB liefert 20 Titel pro Seite.",
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

          <DiscoverFilters movieGenres={movieList} tvGenres={tvList} initial={parsed} />

          <div className="space-y-4">
            <SectionHeader
              title={
                parsed.mediaType === "movie"
                  ? dictionary.discoverPage.discoverMovies
                  : dictionary.discoverPage.discoverSeries
              }
              subtitle={`${paginationText.resultsLabel} · ${paginationText.page} ${result.page} ${paginationText.of} ${totalPages} · ${paginationText.tmdbPageInfo}`}
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
                      href={buildDiscoverHref({ ...parsed, page: Math.max(1, result.page - 1) })}
                    >
                      {paginationText.previous}
                    </Link>
                  </Button>
                  {visiblePages.map(page => (
                    <Button key={page} asChild variant={page === result.page ? "default" : "outline"} size="sm">
                      <Link href={buildDiscoverHref({ ...parsed, page })}>{page}</Link>
                    </Button>
                  ))}
                  <Button asChild variant="outline" size="sm" disabled={result.page >= totalPages}>
                    <Link
                      aria-disabled={result.page >= totalPages}
                      href={buildDiscoverHref({ ...parsed, page: Math.min(totalPages, result.page + 1) })}
                    >
                      {paginationText.next}
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
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
