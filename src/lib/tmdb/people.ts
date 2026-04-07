import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapPersonDetail } from "@/lib/tmdb/mappers";
import type { Locale } from "@/lib/i18n/types";
import type {
  TmdbCombinedCreditsResponse,
  TmdbPaginatedResponse,
  TmdbPersonDetails,
  TmdbPersonSearchResult
} from "@/lib/tmdb/types";

export async function getPersonDetail(id: number, locale: Locale = "de") {
  const { movieGenres, tvGenres } = await getGenreMaps(locale);
  const [details, credits] = await Promise.all([
    fetchTmdb<TmdbPersonDetails>(`/person/${id}`, undefined, undefined, locale),
    fetchTmdb<TmdbCombinedCreditsResponse>(`/person/${id}/combined_credits`, undefined, undefined, locale)
  ]);

  return mapPersonDetail(details, credits, movieGenres, tvGenres);
}

export async function searchPeople(query: string, locale: Locale = "de") {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [] as TmdbPersonSearchResult[];
  }

  const response = await fetchTmdb<TmdbPaginatedResponse<TmdbPersonSearchResult>>(
    "/search/person",
    {
      query: normalizedQuery,
      page: 1
    },
    undefined,
    locale
  );

  return response.results ?? [];
}
