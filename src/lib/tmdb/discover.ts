import { fetchTmdb } from "@/lib/tmdb/client";
import { mapMediaListItem } from "@/lib/tmdb/mappers";
import type { TmdbGenre, TmdbPaginatedResponse } from "@/lib/tmdb/types";

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

  const response = await fetchTmdb<TmdbPaginatedResponse<any>>(
    `/discover/${input.mediaType}`,
    {
      with_genres: input.genre,
      sort_by: input.sort,
      page: input.page,
      "vote_average.gte": input.rating,
      [releaseField]: input.year
    }
  );

  return {
    page: response.page,
    totalPages: response.total_pages,
    totalResults: response.total_results,
    items: response.results.map((item: any) =>
      mapMediaListItem(item, input.mediaType, genresById)
    )
  };
}
