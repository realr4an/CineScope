import "server-only";

import { getMovieDetail } from "@/lib/tmdb/movies";
import { getPersonDetail, searchPeople } from "@/lib/tmdb/people";
import { searchMediaWithFallback } from "@/lib/tmdb/search";
import { getTvDetail } from "@/lib/tmdb/tv";
import type { AIPersonContext, AITitleContext } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n/types";
import type { MediaListItem, MediaType, MovieDetail, TvDetail } from "@/types/media";

const MIN_CONFIDENT_MATCH_SCORE = 60;

export interface ResolveMediaHints {
  preferAnimation?: boolean;
  preferLiveAction?: boolean;
  preferJapanese?: boolean;
}

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

function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1).fill(0);

  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row;

    for (let column = 1; column <= right.length; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + substitutionCost
      );
    }

    for (let column = 0; column <= right.length; column += 1) {
      previous[column] = current[column];
    }
  }

  return previous[right.length];
}

function fuzzyTokenOverlap(queryTokens: string[], candidateTokens: string[]) {
  if (!queryTokens.length || !candidateTokens.length) {
    return 0;
  }

  let overlap = 0;

  for (const queryToken of queryTokens) {
    const hasCloseMatch = candidateTokens.some(candidateToken => {
      if (candidateToken === queryToken) {
        return true;
      }

      const maxDistance =
        queryToken.length >= 8 || candidateToken.length >= 8
          ? 2
          : 1;
      return levenshteinDistance(queryToken, candidateToken) <= maxDistance;
    });

    if (hasCloseMatch) {
      overlap += 1;
    }
  }

  return overlap;
}

function normalizedStringSimilarity(left: string, right: string) {
  if (!left.length || !right.length) {
    return 0;
  }

  const distance = levenshteinDistance(left, right);
  const maxLength = Math.max(left.length, right.length);
  return 1 - distance / maxLength;
}

function getTitleMatchScore(
  item: MediaListItem,
  rawQuery: string,
  hints: ResolveMediaHints = {}
) {
  const queryYear = extractYear(rawQuery);
  const queryWithoutYear = rawQuery.replace(/\b(19|20)\d{2}\b/g, " ").trim();
  const query = normalizeTitleValue(queryWithoutYear || rawQuery);
  const queryTokens = tokenize(query);
  const candidateTitles = [item.title, item.originalTitle].filter(Boolean) as string[];
  const normalizedGenres = item.genres.map(genre => normalizeTitleValue(genre.name));
  const normalizedOriginalLanguage = normalizeTitleValue(item.originalLanguage);
  let best = 0;

  for (const title of candidateTitles) {
    const candidate = normalizeTitleValue(title);

    if (!candidate) {
      continue;
    }

    let score = 0;

    const candidateTokens = tokenize(candidate);

    if (candidate === query) {
      score += 130;

      // Avoid overfitting to obscure exact alias matches for short generic queries
      // (e.g. "Demon Slayer" matching a low-signal B-movie instead of the well-known series).
      if (queryTokens.length <= 2 && candidateTokens.length <= 2) {
        if ((item.voteCount ?? 0) < 120) {
          score -= 70;
        }
      }
    } else if (candidate.startsWith(query) || query.startsWith(candidate)) {
      score += 90;
    } else if (candidate.includes(query) || query.includes(candidate)) {
      score += 65;
    }

    if (queryTokens.length) {
      const exactOverlap = queryTokens.filter(token => candidateTokens.includes(token)).length;
      const fuzzyOverlap = fuzzyTokenOverlap(queryTokens, candidateTokens);
      score += Math.round((exactOverlap / queryTokens.length) * 40);
      score += Math.round((fuzzyOverlap / queryTokens.length) * 22);

      if (queryTokens.length >= 4 && fuzzyOverlap <= 1) {
        score -= 22;
      }
    }

    if (query.length >= 5 && candidate.length >= 5) {
      const similarity = normalizedStringSimilarity(query, candidate);
      if (similarity >= 0.88) {
        score += 56;
      } else if (similarity >= 0.78) {
        score += 40;
      } else if (similarity >= 0.7) {
        score += 24;
      }
    }

    if (queryYear && item.releaseDate) {
      const releaseYear = Number(item.releaseDate.slice(0, 4));
      score += releaseYear === queryYear ? 35 : -12;
    }

    if (hints.preferAnimation) {
      score += normalizedGenres.includes("animation") ? 70 : -60;
    }

    if (hints.preferLiveAction) {
      score += normalizedGenres.includes("animation") ? -85 : 28;
    }

    if (hints.preferJapanese) {
      if (normalizedOriginalLanguage.includes("japan")) {
        score += 24;
      } else if (normalizedOriginalLanguage) {
        score -= 8;
      }
    }

    best = Math.max(best, score);
  }

  if (best > 0) {
    const voteCount = item.voteCount ?? 0;
    best += Math.min(60, Math.round(Math.log10(voteCount + 1) * 18));
  }

  return best;
}

function pickBestResolvedMatch(items: MediaListItem[], query: string, hints: ResolveMediaHints = {}) {
  if (!items.length) {
    return null;
  }

  const scored = items
    .map(item => ({
      item,
      score: getTitleMatchScore(item, query, hints)
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
  hints?: ResolveMediaHints;
}) {
  const locale = input.locale ?? "de";
  const results = await searchMediaWithFallback({
    query: input.query,
    mediaType: input.mediaType ?? "all",
    locale
  });
  const match = pickBestResolvedMatch(results.items, input.query, input.hints);

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

function getPersonMatchScore(input: { query: string; name: string; popularity?: number | null }) {
  const query = normalizeTitleValue(input.query);
  const candidate = normalizeTitleValue(input.name);

  if (!query || !candidate) {
    return 0;
  }

  let score = 0;

  if (candidate === query) {
    score += 150;
  } else if (candidate.includes(query) || query.includes(candidate)) {
    score += 95;
  }

  const queryTokens = tokenize(query);
  const candidateTokens = tokenize(candidate);
  if (queryTokens.length) {
    const exactOverlap = queryTokens.filter(token => candidateTokens.includes(token)).length;
    const fuzzyOverlap = fuzzyTokenOverlap(queryTokens, candidateTokens);
    score += Math.round((exactOverlap / queryTokens.length) * 40);
    score += Math.round((fuzzyOverlap / queryTokens.length) * 25);
  }

  const similarity = normalizedStringSimilarity(query, candidate);
  if (similarity >= 0.9) {
    score += 65;
  } else if (similarity >= 0.8) {
    score += 38;
  } else if (similarity >= 0.72) {
    score += 20;
  }

  score += Math.min(15, Math.floor((input.popularity ?? 0) / 25));

  return score;
}

export async function resolvePersonAIContext(input: { query: string; locale?: Locale }) {
  const locale = input.locale ?? "de";
  const results = await searchPeople(input.query, locale);

  if (!results.length) {
    return null;
  }

  const scored = results
    .map(person => ({
      person,
      score: getPersonMatchScore({
        query: input.query,
        name: person.name,
        popularity: person.popularity
      })
    }))
    .sort((left, right) => right.score - left.score);
  const best = scored[0];

  if (!best || best.score < 70) {
    return null;
  }

  const context = await getPersonAIContext(best.person.id, locale);

  return {
    context,
    href: `/person/${best.person.id}`
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
