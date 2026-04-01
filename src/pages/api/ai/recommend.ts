import type { NextApiRequest, NextApiResponse } from "next";

import { resolveAllowedAIPicks } from "@/lib/ai/formatters";
import { askOpenRouterJson } from "@/lib/ai/openrouter";
import { recommendationPrompt } from "@/lib/ai/prompts";
import {
  aiRecommendationResponseSchema,
  recommendSchema
} from "@/lib/ai/schemas";
import { normalizeLocale } from "@/lib/i18n/request";
import { LANGUAGE_COOKIE } from "@/lib/i18n/types";
import { containsPromptInjection } from "@/lib/security/prompt-injection";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  getNextApiRequestIp,
  getRateLimitIdentityKey,
  isSameOriginNextApiRequest
} from "@/lib/security/request";

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
          fallbackError: "Recommendation failed",
          forbiddenOrigin: "Cross-origin requests are not allowed.",
          rateLimited: "Too many recommendation requests. Please try again shortly.",
          unsafePrompt: "The request contains unsafe instruction patterns."
        }
      : {
          methodNotAllowed: "Methode nicht erlaubt",
          noAllowedRecommendations:
            "Es konnten aktuell keine altersgerechten Empfehlungen sicher aufgeloest werden.",
          fallbackError: "Empfehlung fehlgeschlagen",
          forbiddenOrigin: "Cross-Origin-Anfragen sind nicht erlaubt.",
          rateLimited: "Zu viele Empfehlungsanfragen. Bitte versuche es gleich erneut.",
          unsafePrompt: "Die Anfrage enthaelt unsichere Instruktionsmuster."
        };

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: text.methodNotAllowed });
  }

  if (!isSameOriginNextApiRequest(request)) {
    return response.status(403).json({ error: text.forbiddenOrigin });
  }

  const ip = getNextApiRequestIp(request);
  const rateLimit = checkRateLimit(
    getRateLimitIdentityKey("api-ai-recommend", ip),
    25,
    60_000
  );

  if (!rateLimit.allowed) {
    response.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
    return response.status(429).json({ error: text.rateLimited });
  }

  const parsed = recommendSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ error: parsed.error.flatten() });
  }

  if (
    containsPromptInjection([
      parsed.data.prompt,
      ...(parsed.data.feedback ?? []).map(item => item.title)
    ])
  ) {
    return response.status(400).json({ error: text.unsafePrompt });
  }

  try {
    const structured = await askOpenRouterJson(
      recommendationPrompt(parsed.data.prompt, parsed.data.feedback ?? [], locale),
      aiRecommendationResponseSchema
    );
    const dedupedRecommendations = structured.recommendations.filter(
      (recommendation, index, recommendations) =>
        recommendations.findIndex(
          candidate =>
            normalizeTitle(candidate.title) === normalizeTitle(recommendation.title) &&
            candidate.mediaType === recommendation.mediaType
        ) === index
    );
    const resolvedRecommendations = await resolveAllowedAIPicks(dedupedRecommendations, locale);

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
