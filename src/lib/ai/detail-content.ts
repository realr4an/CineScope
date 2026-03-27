import "server-only";

import { unstable_cache } from "next/cache";

import { mapMediaDetailToAIContext } from "@/lib/ai/context";
import { askOpenRouterJson } from "@/lib/ai/openrouter";
import { fitPrompt, titleInsightsPrompt } from "@/lib/ai/prompts";
import { generateSpoilerFreeSummary } from "@/lib/ai/summary";
import {
  aiFitResponseSchema,
  aiTitleInsightsResponseSchema
} from "@/lib/ai/schemas";
import { getWatchlistForViewer } from "@/lib/supabase/queries";
import type {
  AIFitResponse,
  AIRecommendationFeedback,
  AITitleInsightsResponse
} from "@/lib/ai/types";
import type { MediaDetail, WatchlistItem } from "@/types/media";

const AI_CACHE_SECONDS = 60 * 60 * 24 * 7;

function mapWatchlistToFeedback(items: WatchlistItem[]): AIRecommendationFeedback[] {
  return items
    .filter(item => item.watched || item.liked !== null)
    .map(item => ({
      title: item.title,
      mediaType: item.mediaType,
      watched: item.watched,
      liked: item.liked
    }));
}

function getCachedSummary(media: MediaDetail) {
  return unstable_cache(
    async () =>
      generateSpoilerFreeSummary({
        title: media.title,
        mediaType: media.mediaType,
        overview: media.overview,
        genres: media.genres.map(genre => genre.name),
        releaseDate: media.mediaType === "movie" ? media.releaseDate : media.firstAirDate
      }),
    [`ai-summary-${media.mediaType}-${media.tmdbId}`],
    { revalidate: AI_CACHE_SECONDS }
  )();
}

function getCachedTitleInsights(media: MediaDetail) {
  return unstable_cache(
    async () =>
      askOpenRouterJson(
        titleInsightsPrompt(mapMediaDetailToAIContext(media)),
        aiTitleInsightsResponseSchema
      ),
    [`ai-title-insights-${media.mediaType}-${media.tmdbId}`],
    { revalidate: AI_CACHE_SECONDS }
  )();
}

async function getPersonalFit(
  media: MediaDetail,
  feedback: AIRecommendationFeedback[]
): Promise<AIFitResponse | null> {
  if (!feedback.length) {
    return null;
  }

  return askOpenRouterJson(
    fitPrompt({
      title: mapMediaDetailToAIContext(media),
      feedback
    }),
    aiFitResponseSchema
  );
}

export async function getInitialDetailAI(media: MediaDetail): Promise<{
  summary: string | null;
  insights: AITitleInsightsResponse | null;
  fit: AIFitResponse | null;
  hasFeedbackSignals: boolean;
}> {
  const [summaryResult, insightsResult, watchlistResult] = await Promise.allSettled([
    getCachedSummary(media),
    getCachedTitleInsights(media),
    getWatchlistForViewer()
  ]);

  const watchlist = watchlistResult.status === "fulfilled" ? watchlistResult.value : [];
  const feedback = mapWatchlistToFeedback(watchlist);

  const fitResult = await (async () => {
    try {
      return await getPersonalFit(media, feedback);
    } catch {
      return null;
    }
  })();

  return {
    summary: summaryResult.status === "fulfilled" ? summaryResult.value : null,
    insights: insightsResult.status === "fulfilled" ? insightsResult.value : null,
    fit: fitResult,
    hasFeedbackSignals: feedback.length > 0
  };
}
