import type { NextApiRequest, NextApiResponse } from "next";

import { resolveAllowedAIPicks } from "@/lib/ai/formatters";
import { askOpenRouter } from "@/lib/ai/openrouter";
import { recommendationPrompt } from "@/lib/ai/prompts";
import {
  aiRecommendationResponseSchema,
  recommendSchema
} from "@/lib/ai/schemas";

function extractJsonPayload(input: string) {
  const match = input.match(/\{[\s\S]*\}/);
  return match?.[0] ?? input;
}

function normalizeTitle(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/gi, " ").trim();
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
    const dedupedRecommendations = structured.recommendations.filter(
      (recommendation, index, recommendations) =>
        recommendations.findIndex(
          candidate =>
            normalizeTitle(candidate.title) === normalizeTitle(recommendation.title) &&
            candidate.mediaType === recommendation.mediaType
        ) === index
    );
    const resolvedRecommendations = await resolveAllowedAIPicks(dedupedRecommendations);

    return response.status(200).json({
      recommendations: resolvedRecommendations,
      message: resolvedRecommendations.length
        ? undefined
        : "Es konnten aktuell keine altersgerechten Empfehlungen sicher aufgelÃƒâ€“st werden."
    });
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Recommendation failed"
    });
  }
}

