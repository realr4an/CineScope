import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapMediaListItem, mapTvDetail } from "@/lib/tmdb/mappers";
import type {
  TmdbCreditsResponse,
  TmdbPaginatedResponse,
  TmdbTvDetails,
  TmdbVideosResponse
} from "@/lib/tmdb/types";

export async function getTrendingTv() {
  const { tvGenres } = await getGenreMaps();
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>("/trending/tv/week");
  return response.results.map(item => mapMediaListItem(item, "tv", tvGenres));
}

export async function getPopularTv() {
  const { tvGenres } = await getGenreMaps();
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>("/tv/popular");
  return response.results.map(item => mapMediaListItem(item, "tv", tvGenres));
}

export async function getTvDetail(id: number) {
  const { tvGenres } = await getGenreMaps();
  const [details, credits, videos, similar] = await Promise.all([
    fetchTmdb<TmdbTvDetails>(`/tv/${id}`),
    fetchTmdb<TmdbCreditsResponse>(`/tv/${id}/credits`),
    fetchTmdb<TmdbVideosResponse>(`/tv/${id}/videos`),
    fetchTmdb<TmdbPaginatedResponse<any>>(`/tv/${id}/similar`)
  ]);

  return mapTvDetail(details, credits, videos, similar.results, tvGenres);
}
