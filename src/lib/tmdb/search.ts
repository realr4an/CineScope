import { getSearchFallbackQueries } from "@/lib/ai/search-query";
import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapMediaListItem } from "@/lib/tmdb/mappers";
import type { MediaListItem } from "@/types/media";
import type { TmdbPaginatedResponse } from "@/lib/tmdb/types";

async function runTmdbSearch(input: {
  query: string;
  mediaType: "all" | "movie" | "tv";
}) {
  if (!input.query.trim()) {
    return [] as MediaListItem[];
  }

  const { movieGenres, tvGenres } = await getGenreMaps();

  if (input.mediaType === "all") {
    const response = await fetchTmdb<TmdbPaginatedResponse<any>>("/search/multi", {
      query: input.query
    });

    return response.results
      .filter(result => result.media_type === "movie" || result.media_type === "tv")
      .map(result =>
        mapMediaListItem(
          result,
          result.media_type,
          result.media_type === "movie" ? movieGenres : tvGenres
        )
      );
  }

  const type = input.mediaType;
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>(`/search/${type}`, {
    query: input.query
  });

  return response.results.map(result =>
    mapMediaListItem(result, type, type === "movie" ? movieGenres : tvGenres)
  );
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
}) {
  return runTmdbSearch(input);
}

export async function searchMediaWithFallback(input: {
  query: string;
  mediaType: "all" | "movie" | "tv";
}) {
  const originalQuery = input.query.trim();
  const baseResults = dedupeItems(await runTmdbSearch({ ...input, query: originalQuery }));

  if (baseResults.length >= 3 || originalQuery.length < 3) {
    return {
      items: baseResults,
      appliedQuery: originalQuery,
      fallbackUsed: false
    };
  }

  const fallbackQueries = await getSearchFallbackQueries({
    query: originalQuery,
    mediaType: input.mediaType
  });

  let bestQuery = originalQuery;
  let bestResults = baseResults;

  for (const candidate of fallbackQueries) {
    const candidateResults = dedupeItems(
      await runTmdbSearch({ ...input, query: candidate })
    );

    if (candidateResults.length > bestResults.length) {
      bestQuery = candidate;
      bestResults = candidateResults;
    }
  }

  const shouldUseFallback =
    bestQuery.toLowerCase() !== originalQuery.toLowerCase() &&
    bestResults.length > 0 &&
    (baseResults.length === 0 || bestResults.length >= baseResults.length + 2);

  return {
    items: shouldUseFallback ? bestResults : baseResults,
    appliedQuery: shouldUseFallback ? bestQuery : originalQuery,
    fallbackUsed: shouldUseFallback
  };
}
