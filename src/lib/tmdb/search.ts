import { getSearchFallbackQueries } from "@/lib/ai/search-query";
import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapMediaListItem } from "@/lib/tmdb/mappers";
import type { Locale } from "@/lib/i18n/types";
import type { MediaListItem } from "@/types/media";
import type { TmdbPaginatedResponse } from "@/lib/tmdb/types";

const TMDB_PAGE_SIZE = 20;
const SEARCH_PAGE_SIZE = 60;
const TMDB_MAX_PAGES = 500;
const TMDB_PAGES_PER_SEARCH_PAGE = SEARCH_PAGE_SIZE / TMDB_PAGE_SIZE;

async function runTmdbSearch(input: {
  query: string;
  mediaType: "all" | "movie" | "tv";
  page?: number;
  locale?: Locale;
}) {
  if (!input.query.trim()) {
    return {
      items: [] as MediaListItem[],
      page: Math.max(1, input.page ?? 1),
      totalPages: 1,
      totalResults: 0
    };
  }

  const locale = input.locale ?? "de";
  const { movieGenres, tvGenres } = await getGenreMaps(locale);
  const requestedPage = Math.max(1, input.page ?? 1);
  const tmdbStartPage = (requestedPage - 1) * TMDB_PAGES_PER_SEARCH_PAGE + 1;
  const tmdbPages = Array.from({ length: TMDB_PAGES_PER_SEARCH_PAGE }, (_, index) => tmdbStartPage + index)
    .filter(page => page <= TMDB_MAX_PAGES);

  if (input.mediaType === "all") {
    const responses = await Promise.all(
      tmdbPages.map(page =>
        fetchTmdb<TmdbPaginatedResponse<any>>("/search/multi", {
          query: input.query,
          page
        }, undefined, locale)
      )
    );

    const firstResponse = responses[0];
    const totalTmdbResults = Math.min(firstResponse.total_results, TMDB_MAX_PAGES * TMDB_PAGE_SIZE);

    return {
      items: responses
        .flatMap(response => response.results)
        .filter(result => result.media_type === "movie" || result.media_type === "tv")
        .map(result =>
          mapMediaListItem(
            result,
            result.media_type,
            result.media_type === "movie" ? movieGenres : tvGenres
          )
        ),
      page: requestedPage,
      totalPages: Math.max(1, Math.ceil(totalTmdbResults / SEARCH_PAGE_SIZE)),
      totalResults: totalTmdbResults
    };
  }

  const type = input.mediaType;
  const responses = await Promise.all(
    tmdbPages.map(page =>
      fetchTmdb<TmdbPaginatedResponse<any>>(`/search/${type}`, {
        query: input.query,
        page
      }, undefined, locale)
    )
  );

  const firstResponse = responses[0];
  const totalTmdbResults = Math.min(firstResponse.total_results, TMDB_MAX_PAGES * TMDB_PAGE_SIZE);

  return {
    items: responses.flatMap(response =>
      response.results.map(result =>
        mapMediaListItem(result, type, type === "movie" ? movieGenres : tvGenres)
      )
    ),
    page: requestedPage,
    totalPages: Math.max(1, Math.ceil(totalTmdbResults / SEARCH_PAGE_SIZE)),
    totalResults: totalTmdbResults
  };
}

function dedupeItems(items: MediaListItem[]) {
  const seen = new Set<string>();

  return items.filter(item => {
    const key = `${item.mediaType}-${item.tmdbId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function searchMedia(input: {
  query: string;
  mediaType: "all" | "movie" | "tv";
  page?: number;
  locale?: Locale;
}) {
  return runTmdbSearch(input);
}

export async function searchMediaWithFallback(input: {
  query: string;
  mediaType: "all" | "movie" | "tv";
  page?: number;
  locale?: Locale;
}) {
  const originalQuery = input.query.trim();
  const baseResult = await runTmdbSearch({ ...input, query: originalQuery });
  const baseItems = dedupeItems(baseResult.items);

  if (baseItems.length >= 3 || originalQuery.length < 3) {
    return {
      items: baseItems,
      appliedQuery: originalQuery,
      fallbackUsed: false,
      page: baseResult.page,
      totalPages: baseResult.totalPages,
      totalResults: baseResult.totalResults
    };
  }

  const fallbackQueries = await getSearchFallbackQueries({
    query: originalQuery,
    mediaType: input.mediaType
  });

  let bestQuery = originalQuery;
  let bestResult = { ...baseResult, items: baseItems };

  for (const candidate of fallbackQueries) {
    const candidateResult = await runTmdbSearch({ ...input, query: candidate });
    const candidateItems = dedupeItems(candidateResult.items);

    if (candidateItems.length > bestResult.items.length) {
      bestQuery = candidate;
      bestResult = {
        ...candidateResult,
        items: candidateItems
      };
    }
  }

  const shouldUseFallback =
    bestQuery.toLowerCase() !== originalQuery.toLowerCase() &&
    bestResult.items.length > 0 &&
    (baseItems.length === 0 || bestResult.items.length >= baseItems.length + 2);

  return {
    items: shouldUseFallback ? bestResult.items : baseItems,
    appliedQuery: shouldUseFallback ? bestQuery : originalQuery,
    fallbackUsed: shouldUseFallback,
    page: shouldUseFallback ? bestResult.page : baseResult.page,
    totalPages: shouldUseFallback ? bestResult.totalPages : baseResult.totalPages,
    totalResults: shouldUseFallback ? bestResult.totalResults : baseResult.totalResults
  };
}
