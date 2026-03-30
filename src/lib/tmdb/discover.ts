import { fetchTmdb } from "@/lib/tmdb/client";
import { mapMediaListItem } from "@/lib/tmdb/mappers";
import type { Locale } from "@/lib/i18n/types";
import type { TmdbGenre, TmdbPaginatedResponse } from "@/lib/tmdb/types";

const TMDB_PAGE_SIZE = 20;
const DISCOVER_PAGE_SIZE = 60;
const TMDB_MAX_PAGES = 500;
const TMDB_PAGES_PER_DISCOVER_PAGE = DISCOVER_PAGE_SIZE / TMDB_PAGE_SIZE;

function getDiscoverDateField(mediaType: "movie" | "tv") {
  return mediaType === "movie" ? "primary_release_date" : "first_air_date";
}

function buildDateRangeParams(input: {
  mediaType: "movie" | "tv";
  yearFrom?: number;
  yearTo?: number;
}) {
  const dateField = getDiscoverDateField(input.mediaType);
  const params: Record<string, string | undefined> = {};

  if (input.yearFrom) {
    params[`${dateField}.gte`] = `${input.yearFrom}-01-01`;
  }

  if (input.yearTo) {
    params[`${dateField}.lte`] = `${input.yearTo}-12-31`;
  }

  return params;
}

export async function getGenres(mediaType: "movie" | "tv", locale: Locale = "de") {
  const response = await fetchTmdb<{ genres: TmdbGenre[] }>(`/genre/${mediaType}/list`, undefined, undefined, locale);
  return response.genres;
}

export async function getGenreMaps(locale: Locale = "de") {
  const [movieGenres, tvGenres] = await Promise.all([getGenres("movie", locale), getGenres("tv", locale)]);

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
  yearFrom?: number;
  yearTo?: number;
  rating?: number;
  page: number;
  sort: string;
  region?: string;
  providers?: number[];
  locale?: Locale;
}) {
  const locale = input.locale ?? "de";
  const { movieGenres, tvGenres } = await getGenreMaps(locale);
  const genresById = input.mediaType === "movie" ? movieGenres : tvGenres;
  const dateRangeParams = buildDateRangeParams(input);
  const providerFilter = input.providers?.length ? input.providers.join("|") : undefined;

  const requestedPage = Math.max(1, input.page);
  const tmdbStartPage = (requestedPage - 1) * TMDB_PAGES_PER_DISCOVER_PAGE + 1;
  const tmdbPages = Array.from({ length: TMDB_PAGES_PER_DISCOVER_PAGE }, (_, index) => tmdbStartPage + index)
    .filter(page => page <= TMDB_MAX_PAGES);

  const responses = await Promise.all(
    tmdbPages.map(page =>
      fetchTmdb<TmdbPaginatedResponse<any>>(
        `/discover/${input.mediaType}`,
        {
          with_genres: input.genre,
          sort_by: input.sort,
          page,
          "vote_average.gte": input.rating,
          watch_region: input.region,
          with_watch_providers: providerFilter,
          ...dateRangeParams
        },
        undefined,
        locale
      )
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
