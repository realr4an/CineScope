import { getMediaAgeCertification } from "@/lib/age-gate/server";
import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapMediaListItem, mapTvDetail } from "@/lib/tmdb/mappers";
import type { Locale } from "@/lib/i18n/types";
import type {
  TmdbCreditsResponse,
  TmdbPaginatedResponse,
  TmdbTvDetails,
  TmdbVideosResponse
} from "@/lib/tmdb/types";

export async function getTrendingTv(locale: Locale = "de") {
  const response = await getTrendingTvPage(1, locale);
  return response.items;
}

export async function getTrendingTvPage(page = 1, locale: Locale = "de") {
  const { tvGenres } = await getGenreMaps(locale);
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>(
    "/trending/tv/week",
    { page },
    undefined,
    locale
  );

  return {
    items: response.results.map(item => mapMediaListItem(item, "tv", tvGenres)),
    page: response.page,
    totalPages: response.total_pages,
    totalResults: response.total_results
  };
}

export async function getPopularTv(page = 1, locale: Locale = "de") {
  const { tvGenres } = await getGenreMaps(locale);
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>("/tv/popular", { page }, undefined, locale);
  return {
    items: response.results.map(item => mapMediaListItem(item, "tv", tvGenres)),
    page: response.page,
    totalPages: response.total_pages,
    totalResults: response.total_results
  };
}

export async function getTvDetail(id: number, locale: Locale = "de") {
  const { tvGenres } = await getGenreMaps(locale);
  const [details, credits, videos, similar, ageCertification] = await Promise.all([
    fetchTmdb<TmdbTvDetails>(`/tv/${id}`, undefined, undefined, locale),
    fetchTmdb<TmdbCreditsResponse>(`/tv/${id}/credits`, undefined, undefined, locale),
    fetchTmdb<TmdbVideosResponse>(`/tv/${id}/videos`, undefined, undefined, locale),
    fetchTmdb<TmdbPaginatedResponse<any>>(`/tv/${id}/similar`, undefined, undefined, locale),
    getMediaAgeCertification("tv", id)
  ]);

  return {
    ...mapTvDetail(details, credits, videos, similar.results, tvGenres),
    ageCertification
  };
}
