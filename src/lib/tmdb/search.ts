import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapMediaListItem } from "@/lib/tmdb/mappers";
import type { TmdbPaginatedResponse } from "@/lib/tmdb/types";

export async function searchMedia(input: {
  query: string;
  mediaType: "all" | "movie" | "tv";
}) {
  if (!input.query.trim()) {
    return [];
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
