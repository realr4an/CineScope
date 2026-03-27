import type { NextApiRequest, NextApiResponse } from "next";

import { resolveAllowedAIPicks } from "@/lib/ai/formatters";
import { askOpenRouter } from "@/lib/ai/openrouter";
import { recommendationPrompt } from "@/lib/ai/prompts";
import {
  aiRecommendationResponseSchema,
  recommendSchema
} from "@/lib/ai/schemas";
import { normalizeLocale } from "@/lib/i18n/request";
import { LANGUAGE_COOKIE } from "@/lib/i18n/types";

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
  const locale = normalizeLocale(request.cookies[LANGUAGE_COOKIE]);
  const text =
    locale === "en"
      ? {
          methodNotAllowed: "Method not allowed",
          noAllowedRecommendations:
            "No age-appropriate recommendations could be safely resolved right now.",
          fallbackError: "Recommendation failed"
        }
      : {
          methodNotAllowed: "Methode nicht erlaubt",
          noAllowedRecommendations:
            "Es konnten aktuell keine altersgerechten Empfehlungen sicher aufgelöst werden.",
          fallbackError: "Empfehlung fehlgeschlagen"
        };

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: text.methodNotAllowed });
  }

  const parsed = recommendSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const raw = await askOpenRouter(
      recommendationPrompt(parsed.data.prompt, parsed.data.feedback ?? [], locale)
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
      message: resolvedRecommendations.length ? undefined : text.noAllowedRecommendations
    });
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : text.fallbackError
    });
  }
}
