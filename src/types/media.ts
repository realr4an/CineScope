import type { AgeCertification } from "@/lib/age-gate";

export type MediaType = "movie" | "tv";

export interface Genre {
  id: number;
  name: string;
}

export interface MediaListItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  originalTitle?: string;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  rating: number;
  voteCount: number;
  genres: Genre[];
  ageCertification?: AgeCertification | null;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
  order: number;
}

export interface VideoItem {
  id: string;
  name: string;
  key: string;
  site: string;
  type: string;
  official: boolean;
  publishedAt: string | null;
}

export interface MovieDetail extends MediaListItem {
  mediaType: "movie";
  tagline: string | null;
  runtime: number | null;
  status: string;
  budget: number | null;
  revenue: number | null;
  spokenLanguages: string[];
  cast: CastMember[];
  videos: VideoItem[];
  similar: MediaListItem[];
}

export interface TvDetail extends MediaListItem {
  mediaType: "tv";
  tagline: string | null;
  status: string;
  firstAirDate: string | null;
  lastAirDate: string | null;
  numberOfSeasons: number;
  numberOfEpisodes: number;
  episodeRuntime: number[];
  networks: string[];
  cast: CastMember[];
  videos: VideoItem[];
  similar: MediaListItem[];
}

export type MediaDetail = MovieDetail | TvDetail;

export interface PersonCredit extends MediaListItem {
  roleLabel: string;
}

export interface PersonDetail {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string | null;
  profileUrl: string | null;
  credits: PersonCredit[];
}

export interface MediaSection {
  id: string;
  title: string;
  subtitle?: string;
  items: MediaListItem[];
  href?: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
  watched: boolean;
  liked: boolean | null;
  createdAt: string;
}

export interface WatchlistTogglePayload {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  releaseDate: string | null;
  voteAverage: number | null;
}

export interface AIRecommendation {
  title: string;
  mediaType: MediaType;
  shortReason: string;
  mood?: string;
  comparableTitle?: string;
  tmdbId?: number;
  href?: string;
}
