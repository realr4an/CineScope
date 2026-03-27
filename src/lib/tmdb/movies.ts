import { getMediaAgeCertification } from "@/lib/age-gate/server";
import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapMediaListItem, mapMovieDetail } from "@/lib/tmdb/mappers";
import type {
  TmdbCreditsResponse,
  TmdbMovieDetails,
  TmdbPaginatedResponse,
  TmdbVideosResponse
} from "@/lib/tmdb/types";

export async function getTrendingMovies() {
  const { movieGenres } = await getGenreMaps();
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>("/trending/movie/week");
  return response.results.map(item => mapMediaListItem(item, "movie", movieGenres));
}

export async function getPopularMovies(page = 1) {
  const { movieGenres } = await getGenreMaps();
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>("/movie/popular", { page });
  return {
    items: response.results.map(item => mapMediaListItem(item, "movie", movieGenres)),
    page: response.page,
    totalPages: response.total_pages,
    totalResults: response.total_results
  };
}

export async function getMovieDetail(id: number) {
  const { movieGenres } = await getGenreMaps();
  const [details, credits, videos, similar, ageCertification] = await Promise.all([
    fetchTmdb<TmdbMovieDetails>(`/movie/${id}`),
    fetchTmdb<TmdbCreditsResponse>(`/movie/${id}/credits`),
    fetchTmdb<TmdbVideosResponse>(`/movie/${id}/videos`),
    fetchTmdb<TmdbPaginatedResponse<any>>(`/movie/${id}/similar`),
    getMediaAgeCertification("movie", id)
  ]);

  return {
    ...mapMovieDetail(details, credits, videos, similar.results, movieGenres),
    ageCertification
  };
}
