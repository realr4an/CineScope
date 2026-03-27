import { getMediaAgeCertification } from "@/lib/age-gate/server";
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

export async function getPopularTv(page = 1) {
  const { tvGenres } = await getGenreMaps();
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>("/tv/popular", { page });
  return {
    items: response.results.map(item => mapMediaListItem(item, "tv", tvGenres)),
    page: response.page,
    totalPages: response.total_pages,
    totalResults: response.total_results
  };
}

export async function getTvDetail(id: number) {
  const { tvGenres } = await getGenreMaps();
  const [details, credits, videos, similar, ageCertification] = await Promise.all([
    fetchTmdb<TmdbTvDetails>(`/tv/${id}`),
    fetchTmdb<TmdbCreditsResponse>(`/tv/${id}/credits`),
    fetchTmdb<TmdbVideosResponse>(`/tv/${id}/videos`),
    fetchTmdb<TmdbPaginatedResponse<any>>(`/tv/${id}/similar`),
    getMediaAgeCertification("tv", id)
  ]);

  return {
    ...mapTvDetail(details, credits, videos, similar.results, tvGenres),
    ageCertification
  };
}
