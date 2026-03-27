export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbListResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: TmdbGenre[];
}

export interface TmdbCreditsResponse {
  cast: Array<{
    id: number;
    name: string;
    character?: string;
    profile_path: string | null;
    order: number;
    known_for_department?: string;
  }>;
}

export interface TmdbVideosResponse {
  results: Array<{
    id: string;
    key: string;
    name: string;
    site: string;
    type: string;
    official: boolean;
    published_at: string | null;
  }>;
}

export interface TmdbMovieDetails extends TmdbListResult {
  runtime: number | null;
  status: string;
  tagline: string | null;
  budget: number;
  revenue: number;
  spoken_languages: Array<{ iso_639_1?: string; english_name?: string; name?: string }>;
}

export interface TmdbTvDetails extends TmdbListResult {
  tagline: string | null;
  status: string;
  first_air_date: string;
  last_air_date: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  networks: Array<{ id: number; name: string }>;
  languages?: string[];
}

export interface TmdbPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  known_for_department: string | null;
  profile_path: string | null;
}

export interface TmdbCombinedCreditsResponse {
  cast: Array<
    TmdbListResult & {
      media_type: "movie" | "tv";
      character?: string;
    }
  >;
}

export interface TmdbPaginatedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovieReleaseDatesResponse {
  results: Array<{
    iso_3166_1: string;
    release_dates: Array<{
      certification: string;
      type: number;
    }>;
  }>;
}

export interface TmdbTvContentRatingsResponse {
  results: Array<{
    iso_3166_1: string;
    rating: string;
  }>;
}

export interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number | null;
}

export interface TmdbWatchProviderRegionData {
  link?: string;
  flatrate?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
}

export interface TmdbWatchProvidersResponse {
  id: number;
  results: Record<string, TmdbWatchProviderRegionData | undefined>;
}

export interface TmdbWatchProviderRegion {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

export interface TmdbAvailableRegionsResponse {
  results: TmdbWatchProviderRegion[];
}
