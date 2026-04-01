import "server-only";

import { unstable_cache } from "next/cache";

import { mapMediaDetailToAIContext } from "@/lib/ai/context";
import { askOpenRouterJson } from "@/lib/ai/openrouter";
import { titleInsightsPrompt } from "@/lib/ai/prompts";
import { generateSpoilerFreeSummary } from "@/lib/ai/summary";
import { aiTitleInsightsResponseSchema } from "@/lib/ai/schemas";
import type { AIFitResponse, AITitleInsightsResponse } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n/types";
import type { MediaDetail } from "@/types/media";

const AI_CACHE_SECONDS = 60 * 60 * 24 * 7;

function getCachedSummary(media: MediaDetail, locale: Locale) {
  return unstable_cache(
    async () =>
      generateSpoilerFreeSummary(
        {
          title: media.title,
          mediaType: media.mediaType,
          overview: media.overview,
          genres: media.genres.map(genre => genre.name),
          releaseDate: media.mediaType === "movie" ? media.releaseDate : media.firstAirDate
        },
        locale
      ),
    [`ai-summary-${locale}-${media.mediaType}-${media.tmdbId}`],
    { revalidate: AI_CACHE_SECONDS }
  )();
}

function getCachedTitleInsights(media: MediaDetail, locale: Locale) {
  return unstable_cache(
    async () =>
      askOpenRouterJson(
        titleInsightsPrompt(mapMediaDetailToAIContext(media), locale),
        aiTitleInsightsResponseSchema
      ),
    [`ai-title-insights-${locale}-${media.mediaType}-${media.tmdbId}`],
    { revalidate: AI_CACHE_SECONDS }
  )();
}

export async function getInitialDetailAI(
  media: MediaDetail,
  locale: Locale = "de"
): Promise<{
  summary: string | null;
  insights: AITitleInsightsResponse | null;
  fit: AIFitResponse | null;
  hasFeedbackSignals: boolean;
}> {
  const [summaryResult, insightsResult] = await Promise.allSettled([
    getCachedSummary(media, locale),
    getCachedTitleInsights(media, locale)
  ]);

  return {
    summary: summaryResult.status === "fulfilled" ? summaryResult.value : null,
    insights: insightsResult.status === "fulfilled" ? insightsResult.value : null,
    fit: null,
    hasFeedbackSignals: false
  };
}
