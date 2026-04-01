import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { MediaGrid } from "@/components/sections/media-sections";
import { SectionHeader } from "@/components/shared/ui-components";
import { EmptyState, ErrorState } from "@/components/states/state-components";
import { Button } from "@/components/ui/button";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getPopularMovies, getTrendingMoviesPage } from "@/lib/tmdb/movies";
import { getPopularTv, getTrendingTvPage } from "@/lib/tmdb/tv";

type CollectionKind = "trending-movies" | "trending-tv" | "popular-movies" | "popular-tv";

type CollectionPageProps = {
  params: Promise<{ kind: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parsePageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw ?? "1");

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function buildCollectionHref(kind: CollectionKind, page: number) {
  return `/collections/${kind}?page=${page}`;
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const [{ kind }, rawSearchParams, { dictionary, locale }] = await Promise.all([
    params,
    searchParams,
    getServerDictionary()
  ]);

  const collectionKind = kind as CollectionKind;
  const page = parsePageParam(rawSearchParams.page);

  const isKnownCollection =
    collectionKind === "trending-movies" ||
    collectionKind === "trending-tv" ||
    collectionKind === "popular-movies" ||
    collectionKind === "popular-tv";

  if (!isKnownCollection) {
    notFound();
  }

  const text =
    locale === "en"
      ? {
          previous: "Previous",
          next: "Next",
          page: "Page",
          of: "of",
          noResultsTitle: "No titles available",
          noResultsDescription: "No results were returned for this page.",
          pageInfo: "This page shows up to 20 titles."
        }
      : {
          previous: "Zurück",
          next: "Weiter",
          page: "Seite",
          of: "von",
          noResultsTitle: "Keine Titel verfügbar",
          noResultsDescription: "Für diese Seite wurden keine Ergebnisse zurückgegeben.",
          pageInfo: "Diese Seite zeigt bis zu 20 Titel."
        };

  const metaByKind = {
    "trending-movies": {
      title: dictionary.home.trendingMovies,
      subtitle: dictionary.home.trendingMoviesSubtitle
    },
    "trending-tv": {
      title: dictionary.home.trendingSeries,
      subtitle: dictionary.home.trendingSeriesSubtitle
    },
    "popular-movies": {
      title: dictionary.home.popularMovies,
      subtitle: dictionary.home.popularMoviesSubtitle
    },
    "popular-tv": {
      title: dictionary.home.popularSeries,
      subtitle: dictionary.home.popularSeriesSubtitle
    }
  } as const;

  try {
    const result =
      collectionKind === "trending-movies"
        ? await getTrendingMoviesPage(page, locale)
        : collectionKind === "trending-tv"
          ? await getTrendingTvPage(page, locale)
          : collectionKind === "popular-movies"
            ? await getPopularMovies(page, locale)
            : await getPopularTv(page, locale);

    const safeItems = await filterMediaForViewerAge(result.items);
    const totalPages = Math.max(1, Math.min(result.totalPages, 500));
    const visiblePages = getVisiblePages(result.page, totalPages);

    return (
      <AppShell>
        <div className="space-y-6">
          <SectionHeader
            title={metaByKind[collectionKind].title}
            subtitle={`${metaByKind[collectionKind].subtitle} · ${text.page} ${result.page} ${text.of} ${totalPages} · ${text.pageInfo}`}
          />

          {safeItems.length ? (
            <MediaGrid items={safeItems} />
          ) : (
            <EmptyState title={text.noResultsTitle} description={text.noResultsDescription} />
          )}

          {totalPages > 1 ? (
            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/50 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {text.page} {result.page} {text.of} {totalPages}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm" disabled={result.page <= 1}>
                  <Link
                    aria-disabled={result.page <= 1}
                    href={buildCollectionHref(collectionKind, Math.max(1, result.page - 1))}
                  >
                    {text.previous}
                  </Link>
                </Button>
                {visiblePages.map(visiblePage => (
                  <Button
                    key={visiblePage}
                    asChild
                    variant={visiblePage === result.page ? "default" : "outline"}
                    size="sm"
                  >
                    <Link href={buildCollectionHref(collectionKind, visiblePage)}>{visiblePage}</Link>
                  </Button>
                ))}
                <Button asChild variant="outline" size="sm" disabled={result.page >= totalPages}>
                  <Link
                    aria-disabled={result.page >= totalPages}
                    href={buildCollectionHref(
                      collectionKind,
                      Math.min(totalPages, result.page + 1)
                    )}
                  >
                    {text.next}
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}
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

