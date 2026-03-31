import type { MediaType } from "@/types/media";

export interface AIRecommendationFeedback {
  title: string;
  mediaType: "movie" | "tv";
  watched: boolean;
  liked: boolean | null;
}

export interface AITitleContext {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  originalTitle?: string;
  overview: string;
  genres: string[];
  releaseDate: string | null;
  runtime?: number | null;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  spokenLanguages?: string[];
  networks?: string[];
  cast?: string[];
  rating?: number;
  voteCount?: number;
  tagline?: string | null;
}

export interface AIPersonContext {
  id: number;
  name: string;
  knownForDepartment: string | null;
  biography: string;
  placeOfBirth: string | null;
  birthday: string | null;
  topCredits: Array<{
    title: string;
    mediaType: MediaType;
    roleLabel: string;
    genres: string[];
    releaseDate: string | null;
  }>;
}

export interface AIAssistantPick {
  title: string;
  mediaType: MediaType;
  reason: string;
  comparableTitle?: string;
  tmdbId?: number;
  href?: string;
}

export interface AICompareResponse {
  shortVerdict: string;
  comparison: Array<{
    label: string;
    left: string;
    right: string;
  }>;
  guidance: string;
}

export interface AIFitResponse {
  summary: string;
  reasons: string[];
  counterpoints?: string[];
  caveat?: string;
  confidence?: "low" | "medium" | "high";
  dataNote?: string;
}

export interface AIPriorityResponse {
  summary: string;
  order: Array<{
    title: string;
    mediaType: MediaType;
    reason: string;
    tmdbId?: number;
    href?: string;
  }>;
}

export interface AIAssistantResponse {
  framing: string;
  picks: AIAssistantPick[];
  nextStep?: string;
}

export interface AITitleInsightsResponse {
  vibeTags: string[];
  contentWarning: string;
}

export interface AIPersonInsightsResponse {
  summary: string;
  highlights: string[];
}
