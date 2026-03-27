import { fetchTmdb } from "@/lib/tmdb/client";
import { mapMediaListItem } from "@/lib/tmdb/mappers";
import type { TmdbGenre, TmdbPaginatedResponse } from "@/lib/tmdb/types";

const TMDB_PAGE_SIZE = 20;
const DISCOVER_PAGE_SIZE = 60;
const TMDB_MAX_PAGES = 500;
const TMDB_PAGES_PER_DISCOVER_PAGE = DISCOVER_PAGE_SIZE / TMDB_PAGE_SIZE;

export async function getGenres(mediaType: "movie" | "tv") {
  const response = await fetchTmdb<{ genres: TmdbGenre[] }>(`/genre/${mediaType}/list`);
  return response.genres;
}

export async function getGenreMaps() {
  const [movieGenres, tvGenres] = await Promise.all([getGenres("movie"), getGenres("tv")]);

  return {
    movieGenres: new Map(movieGenres.map(genre => [genre.id, genre])),
    tvGenres: new Map(tvGenres.map(genre => [genre.id, genre])),
    movieList: movieGenres,
    tvList: tvGenres
  };
}

export async function getDiscoverResults(input: {
  mediaType: "movie" | "tv";
  genre?: number;
  year?: number;
  rating?: number;
  page: number;
  sort: string;
}) {
  const { movieGenres, tvGenres } = await getGenreMaps();
  const genresById = input.mediaType === "movie" ? movieGenres : tvGenres;

  const releaseField =
    input.mediaType === "movie" ? "primary_release_year" : "first_air_date_year";

  const requestedPage = Math.max(1, input.page);
  const tmdbStartPage = (requestedPage - 1) * TMDB_PAGES_PER_DISCOVER_PAGE + 1;
  const tmdbPages = Array.from({ length: TMDB_PAGES_PER_DISCOVER_PAGE }, (_, index) => tmdbStartPage + index)
    .filter(page => page <= TMDB_MAX_PAGES);

  const responses = await Promise.all(
    tmdbPages.map(page =>
      fetchTmdb<TmdbPaginatedResponse<any>>(`/discover/${input.mediaType}`, {
        with_genres: input.genre,
        sort_by: input.sort,
        page,
        "vote_average.gte": input.rating,
        [releaseField]: input.year
      })
    )
  );

  const firstResponse = responses[0];
  const totalTmdbResults = Math.min(firstResponse.total_results, TMDB_MAX_PAGES * TMDB_PAGE_SIZE);

  return {
    page: requestedPage,
    totalPages: Math.max(1, Math.ceil(totalTmdbResults / DISCOVER_PAGE_SIZE)),
    totalResults: totalTmdbResults,
    items: responses
      .flatMap(response => response.results)
      .slice(0, DISCOVER_PAGE_SIZE)
      .map((item: any) => mapMediaListItem(item, input.mediaType, genresById))
  };
}
