import "server-only";

import { getMovieDetail } from "@/lib/tmdb/movies";
import { getPersonDetail } from "@/lib/tmdb/people";
import { searchMedia } from "@/lib/tmdb/search";
import { getTvDetail } from "@/lib/tmdb/tv";
import type { AIPersonContext, AITitleContext } from "@/lib/ai/types";
import type { MediaType, MovieDetail, TvDetail } from "@/types/media";

export function mapMediaDetailToAIContext(detail: MovieDetail | TvDetail): AITitleContext {
  return {
    tmdbId: detail.tmdbId,
    mediaType: detail.mediaType,
    title: detail.title,
    originalTitle: detail.originalTitle,
    overview: detail.overview,
    genres: detail.genres.map(genre => genre.name),
    releaseDate: detail.mediaType === "movie" ? detail.releaseDate : detail.firstAirDate,
    runtime: detail.mediaType === "movie" ? detail.runtime : detail.episodeRuntime?.[0] ?? null,
    numberOfSeasons: detail.mediaType === "tv" ? detail.numberOfSeasons : undefined,
    numberOfEpisodes: detail.mediaType === "tv" ? detail.numberOfEpisodes : undefined,
    spokenLanguages: detail.mediaType === "movie" ? detail.spokenLanguages : undefined,
    networks: detail.mediaType === "tv" ? detail.networks : undefined,
    cast: detail.cast.slice(0, 6).map(member => member.name),
    rating: detail.rating,
    voteCount: detail.voteCount,
    tagline: detail.tagline
  };
}

export async function getMediaAIContext(mediaType: MediaType, tmdbId: number) {
  const detail =
    mediaType === "movie" ? await getMovieDetail(tmdbId) : await getTvDetail(tmdbId);

  return mapMediaDetailToAIContext(detail);
}

export async function resolveMediaAIContext(input: {
  query: string;
  mediaType?: "all" | MediaType;
}) {
  const results = await searchMedia({
    query: input.query,
    mediaType: input.mediaType ?? "all"
  });

  const normalizedQuery = input.query.toLowerCase().trim();
  const match =
    results.items.find(
      result =>
        result.title.toLowerCase() === normalizedQuery ||
        result.originalTitle?.toLowerCase() === normalizedQuery
    ) ?? results.items[0];

  if (!match) {
    return null;
  }

  const context = await getMediaAIContext(match.mediaType, match.tmdbId);

  return {
    context,
    href: `/${match.mediaType}/${match.tmdbId}`
  };
}

export async function getPersonAIContext(id: number): Promise<AIPersonContext> {
  const person = await getPersonDetail(id);

  return {
    id: person.id,
    name: person.name,
    knownForDepartment: person.knownForDepartment,
    biography: person.biography,
    placeOfBirth: person.placeOfBirth,
    birthday: person.birthday,
    topCredits: person.credits.slice(0, 8).map(credit => ({
      title: credit.title,
      mediaType: credit.mediaType,
      roleLabel: credit.roleLabel,
      genres: credit.genres.map(genre => genre.name),
      releaseDate: credit.releaseDate
    }))
  };
}

export async function getManyMediaAIContexts(
  items: Array<{ tmdbId: number; mediaType: MediaType }>
) {
  const contexts = await Promise.all(
    items.map(item => getMediaAIContext(item.mediaType, item.tmdbId))
  );

  return contexts;
}
