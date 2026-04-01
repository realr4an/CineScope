import "server-only";

import { getDiscoverResults } from "@/lib/tmdb/discover";
import { getMovieRecommendationContext } from "@/lib/tmdb/movies";
import { getTvRecommendationContext } from "@/lib/tmdb/tv";
import type { Locale } from "@/lib/i18n/types";
import type { MediaListItem, MediaType, WatchlistItem } from "@/types/media";

type RankedCandidate = {
  item: MediaListItem;
  score: number;
};

type RecommendationContext = {
  genres: Array<{ id: number; name: string }>;
  similar: MediaListItem[];
};

function buildMediaKey(mediaType: MediaType, tmdbId: number) {
  return `${mediaType}:${tmdbId}`;
}

function addGenreScore(map: Map<number, number>, genreIds: number[], score: number) {
  for (const genreId of genreIds) {
    map.set(genreId, (map.get(genreId) ?? 0) + score);
  }
}

function upsertCandidate(
  candidates: Map<string, RankedCandidate>,
  item: MediaListItem,
  score: number
) {
  const key = buildMediaKey(item.mediaType, item.tmdbId);
  const existing = candidates.get(key);

  if (!existing || score > existing.score) {
    candidates.set(key, { item, score });
  }
}

function getTopGenres(input: {
  positive: Map<number, number>;
  negative: Map<number, number>;
  limit: number;
}) {
  return Array.from(input.positive.entries())
    .map(([genreId, positiveScore]) => ({
      genreId,
      netScore: positiveScore - (input.negative.get(genreId) ?? 0)
    }))
    .filter(entry => entry.netScore > 0)
    .sort((left, right) => right.netScore - left.netScore)
    .slice(0, input.limit)
    .map(entry => entry.genreId);
}

async function loadRecommendationContext(
  item: WatchlistItem,
  locale: Locale
): Promise<RecommendationContext | null> {
  try {
    return item.mediaType === "movie"
      ? await getMovieRecommendationContext(item.tmdbId, locale)
      : await getTvRecommendationContext(item.tmdbId, locale);
  } catch {
    return null;
  }
}

export async function getHomePersonalizedRows(input: {
  watchlist: WatchlistItem[];
  locale: Locale;
  limitPerType?: number;
}) {
  const limitPerType = input.limitPerType ?? 20;
  const watchlist = input.watchlist;

  if (!watchlist.length) {
    return { movies: [], tv: [] };
  }

  const likedSeeds = watchlist.filter(item => item.liked === true).slice(0, 4);
  const watchedNeutralSeeds = watchlist
    .filter(item => item.watched && item.liked === null)
    .slice(0, 3);
  const fallbackSeeds = watchlist.filter(item => item.watched && item.liked !== false).slice(0, 4);
  const seeds = (likedSeeds.length ? [...likedSeeds, ...watchedNeutralSeeds] : fallbackSeeds).slice(0, 5);

  if (!seeds.length) {
    return { movies: [], tv: [] };
  }

  const dislikedSeeds = watchlist.filter(item => item.liked === false).slice(0, 3);
  const excludedKeys = new Set(watchlist.map(item => buildMediaKey(item.mediaType, item.tmdbId)));
  const movieCandidates = new Map<string, RankedCandidate>();
  const tvCandidates = new Map<string, RankedCandidate>();
  const moviePositiveGenres = new Map<number, number>();
  const tvPositiveGenres = new Map<number, number>();
  const movieNegativeGenres = new Map<number, number>();
  const tvNegativeGenres = new Map<number, number>();

  const seedContexts = await Promise.all(
    seeds.map(seed => loadRecommendationContext(seed, input.locale))
  );

  for (const [index, context] of seedContexts.entries()) {
    if (!context) {
      continue;
    }

    const seed = seeds[index];
    const isStrongSeed = seed.liked === true;
    const baseSeedScore = isStrongSeed ? 120 : 90;
    const genreScore = isStrongSeed ? 4 : 2;
    const positiveGenreMap = seed.mediaType === "movie" ? moviePositiveGenres : tvPositiveGenres;
    addGenreScore(
      positiveGenreMap,
      context.genres.map(genre => genre.id),
      genreScore
    );

    for (const [similarIndex, similarItem] of context.similar.entries()) {
      const key = buildMediaKey(similarItem.mediaType, similarItem.tmdbId);

      if (excludedKeys.has(key)) {
        continue;
      }

      const score =
        baseSeedScore -
        similarIndex * 3 +
        Math.min(12, Math.floor((similarItem.voteCount ?? 0) / 2_000)) +
        Math.min(8, Math.round(similarItem.rating));
      if (similarItem.mediaType === "movie") {
        upsertCandidate(movieCandidates, similarItem, score);
      } else {
        upsertCandidate(tvCandidates, similarItem, score);
      }
    }
  }

  const dislikedContexts = await Promise.all(
    dislikedSeeds.map(seed => loadRecommendationContext(seed, input.locale))
  );

  for (const [index, context] of dislikedContexts.entries()) {
    if (!context) {
      continue;
    }

    const targetMap =
      dislikedSeeds[index].mediaType === "movie" ? movieNegativeGenres : tvNegativeGenres;
    addGenreScore(
      targetMap,
      context.genres.map(genre => genre.id),
      3
    );
  }

  const movieTopGenres = getTopGenres({
    positive: moviePositiveGenres,
    negative: movieNegativeGenres,
    limit: 3
  });
  const tvTopGenres = getTopGenres({
    positive: tvPositiveGenres,
    negative: tvNegativeGenres,
    limit: 3
  });

  const fillDiscoverCandidates = async (
    mediaType: MediaType,
    topGenres: number[],
    targetCandidates: Map<string, RankedCandidate>
  ) => {
    if (targetCandidates.size >= limitPerType || !topGenres.length) {
      return;
    }

    for (const genreId of topGenres) {
      if (targetCandidates.size >= limitPerType) {
        break;
      }

      const discover = await getDiscoverResults({
        mediaType,
        genre: genreId,
        page: 1,
        sort: "vote_count.desc",
        locale: input.locale
      });

      for (const [index, item] of discover.items.entries()) {
        if (targetCandidates.size >= limitPerType) {
          break;
        }

        const key = buildMediaKey(item.mediaType, item.tmdbId);
        if (excludedKeys.has(key)) {
          continue;
        }

        const score =
          65 -
          index +
          Math.min(10, Math.floor((item.voteCount ?? 0) / 2_500)) +
          Math.min(8, Math.round(item.rating));
        upsertCandidate(targetCandidates, item, score);
      }
    }
  };

  await Promise.all([
    fillDiscoverCandidates("movie", movieTopGenres, movieCandidates),
    fillDiscoverCandidates("tv", tvTopGenres, tvCandidates)
  ]);

  const toSortedItems = (candidates: Map<string, RankedCandidate>) =>
    Array.from(candidates.values())
      .sort((left, right) => right.score - left.score)
      .slice(0, limitPerType)
      .map(candidate => candidate.item);

  return {
    movies: toSortedItems(movieCandidates),
    tv: toSortedItems(tvCandidates)
  };
}

