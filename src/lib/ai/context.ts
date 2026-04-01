import "server-only";

import { getMovieDetail } from "@/lib/tmdb/movies";
import { getPersonDetail } from "@/lib/tmdb/people";
import { searchMediaWithFallback } from "@/lib/tmdb/search";
import { getTvDetail } from "@/lib/tmdb/tv";
import type { AIPersonContext, AITitleContext } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n/types";
import type { MediaListItem, MediaType, MovieDetail, TvDetail } from "@/types/media";

const MIN_CONFIDENT_MATCH_SCORE = 60;

function normalizeTitleValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractYear(value: string) {
  const match = value.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function tokenize(value: string) {
  return normalizeTitleValue(value)
    .split(" ")
    .filter(token => token.length >= 2);
}

function getTitleMatchScore(item: MediaListItem, rawQuery: string) {
  const queryYear = extractYear(rawQuery);
  const queryWithoutYear = rawQuery.replace(/\b(19|20)\d{2}\b/g, " ").trim();
  const query = normalizeTitleValue(queryWithoutYear || rawQuery);
  const queryTokens = tokenize(query);
  const candidateTitles = [item.title, item.originalTitle].filter(Boolean) as string[];
  let best = 0;

  for (const title of candidateTitles) {
    const candidate = normalizeTitleValue(title);

    if (!candidate) {
      continue;
    }

    let score = 0;

    if (candidate === query) {
      score += 130;
    } else if (candidate.startsWith(query) || query.startsWith(candidate)) {
      score += 90;
    } else if (candidate.includes(query) || query.includes(candidate)) {
      score += 65;
    }

    if (queryTokens.length) {
      const candidateTokenSet = new Set(tokenize(candidate));
      const overlap = queryTokens.filter(token => candidateTokenSet.has(token)).length;
      score += Math.round((overlap / queryTokens.length) * 40);
    }

    if (queryYear && item.releaseDate) {
      const releaseYear = Number(item.releaseDate.slice(0, 4));
      score += releaseYear === queryYear ? 35 : -12;
    }

    best = Math.max(best, score);
  }

  if (best > 0) {
    best += Math.min(8, Math.floor((item.voteCount ?? 0) / 2_500));
  }

  return best;
}

function pickBestResolvedMatch(items: MediaListItem[], query: string) {
  if (!items.length) {
    return null;
  }

  const scored = items
    .map(item => ({
      item,
      score: getTitleMatchScore(item, query)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (right.item.voteCount ?? 0) - (left.item.voteCount ?? 0);
    });

  const best = scored[0];

  if (!best || best.score < MIN_CONFIDENT_MATCH_SCORE) {
    return null;
  }

  return best.item;
}

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

export async function getMediaAIContext(mediaType: MediaType, tmdbId: number, locale: Locale = "de") {
  const detail =
    mediaType === "movie" ? await getMovieDetail(tmdbId, locale) : await getTvDetail(tmdbId, locale);

  return mapMediaDetailToAIContext(detail);
}

export async function resolveMediaAIContext(input: {
  query: string;
  mediaType?: "all" | MediaType;
  locale?: Locale;
}) {
  const locale = input.locale ?? "de";
  const results = await searchMediaWithFallback({
    query: input.query,
    mediaType: input.mediaType ?? "all",
    locale
  });
  const match = pickBestResolvedMatch(results.items, input.query);

  if (!match) {
    return null;
  }

  const context = await getMediaAIContext(match.mediaType, match.tmdbId, locale);

  return {
    context,
    href: `/${match.mediaType}/${match.tmdbId}`
  };
}

export async function getPersonAIContext(id: number, locale: Locale = "de"): Promise<AIPersonContext> {
  const person = await getPersonDetail(id, locale);

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
  items: Array<{ tmdbId: number; mediaType: MediaType }>,
  locale: Locale = "de"
) {
  const contexts = await Promise.all(
    items.map(item => getMediaAIContext(item.mediaType, item.tmdbId, locale))
  );

  return contexts;
}
