import type { NextApiRequest, NextApiResponse } from "next";

import { askOpenRouter } from "@/lib/ai/openrouter";
import { recommendationPrompt } from "@/lib/ai/prompts";
import { searchMedia } from "@/lib/tmdb/search";
import {
  aiRecommendationResponseSchema,
  recommendSchema
} from "@/lib/ai/schemas";
import type { AIRecommendation } from "@/types/media";

function extractJsonPayload(input: string) {
  const match = input.match(/\{[\s\S]*\}/);
  return match?.[0] ?? input;
}

function normalizeTitle(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/gi, " ").trim();
}

async function resolveRecommendation(recommendation: AIRecommendation) {
  try {
    const results = await searchMedia({
      query: recommendation.title,
      mediaType: recommendation.mediaType
    });

    const normalizedTarget = normalizeTitle(recommendation.title);
    const exactMatch =
      results.find(
        result =>
          normalizeTitle(result.title) === normalizedTarget ||
          normalizeTitle(result.originalTitle ?? "") === normalizedTarget
      ) ?? results[0];

    if (!exactMatch) {
      return {
        ...recommendation,
        href: `/search?q=${encodeURIComponent(recommendation.title)}&type=${recommendation.mediaType}`
      };
    }

    return {
      ...recommendation,
      tmdbId: exactMatch.tmdbId,
      href: `/${exactMatch.mediaType}/${exactMatch.tmdbId}`
    };
  } catch {
    return {
      ...recommendation,
      href: `/search?q=${encodeURIComponent(recommendation.title)}&type=${recommendation.mediaType}`
    };
  }
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const parsed = recommendSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const raw = await askOpenRouter(
      recommendationPrompt(parsed.data.prompt, parsed.data.feedback ?? [])
    );
    const structured = aiRecommendationResponseSchema.parse(
      JSON.parse(extractJsonPayload(raw))
    );
    const resolvedRecommendations = await Promise.all(
      structured.recommendations.map(resolveRecommendation)
    );

    return response.status(200).json({ recommendations: resolvedRecommendations });
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Recommendation failed"
    });
  }
}
