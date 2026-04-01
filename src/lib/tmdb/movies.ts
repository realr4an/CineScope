import { getMediaAgeCertification } from "@/lib/age-gate/server";
import { fetchTmdb } from "@/lib/tmdb/client";
import { getGenreMaps } from "@/lib/tmdb/discover";
import { mapMediaListItem, mapMovieDetail } from "@/lib/tmdb/mappers";
import type { Locale } from "@/lib/i18n/types";
import type {
  TmdbCreditsResponse,
  TmdbMovieDetails,
  TmdbPaginatedResponse,
  TmdbVideosResponse
} from "@/lib/tmdb/types";

export async function getTrendingMovies(locale: Locale = "de") {
  const response = await getTrendingMoviesPage(1, locale);
  return response.items;
}

export async function getTrendingMoviesPage(page = 1, locale: Locale = "de") {
  const { movieGenres } = await getGenreMaps(locale);
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>(
    "/trending/movie/week",
    { page },
    undefined,
    locale
  );

  return {
    items: response.results.map(item => mapMediaListItem(item, "movie", movieGenres)),
    page: response.page,
    totalPages: response.total_pages,
    totalResults: response.total_results
  };
}

export async function getPopularMovies(page = 1, locale: Locale = "de") {
  const { movieGenres } = await getGenreMaps(locale);
  const response = await fetchTmdb<TmdbPaginatedResponse<any>>("/movie/popular", { page }, undefined, locale);
  return {
    items: response.results.map(item => mapMediaListItem(item, "movie", movieGenres)),
    page: response.page,
    totalPages: response.total_pages,
    totalResults: response.total_results
  };
}

export async function getMovieDetail(id: number, locale: Locale = "de") {
  const { movieGenres } = await getGenreMaps(locale);
  const [details, credits, videos, similar, ageCertification] = await Promise.all([
    fetchTmdb<TmdbMovieDetails>(`/movie/${id}`, undefined, undefined, locale),
    fetchTmdb<TmdbCreditsResponse>(`/movie/${id}/credits`, undefined, undefined, locale),
    fetchTmdb<TmdbVideosResponse>(`/movie/${id}/videos`, undefined, undefined, locale),
    fetchTmdb<TmdbPaginatedResponse<any>>(`/movie/${id}/similar`, undefined, undefined, locale),
    getMediaAgeCertification("movie", id)
  ]);

  return {
    ...mapMovieDetail(details, credits, videos, similar.results, movieGenres),
    ageCertification
  };
}

export async function getMovieRecommendationContext(id: number, locale: Locale = "de") {
  const { movieGenres } = await getGenreMaps(locale);
  const [details, similar] = await Promise.all([
    fetchTmdb<TmdbMovieDetails>(`/movie/${id}`, undefined, undefined, locale),
    fetchTmdb<TmdbPaginatedResponse<any>>(`/movie/${id}/similar`, undefined, undefined, locale)
  ]);

  return {
    genres: (details.genres ?? []).map(genre => ({
      id: genre.id,
      name: genre.name
    })),
    similar: similar.results.map(item => mapMediaListItem(item, "movie", movieGenres))
  };
}
