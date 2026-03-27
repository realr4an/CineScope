import "server-only";

import { resolveMediaAIContext } from "@/lib/ai/context";
import type { AIAssistantPick } from "@/lib/ai/types";
import type { MediaType } from "@/types/media";

export async function resolveAIPick<T extends { title: string; mediaType: MediaType }>(
  pick: T
) {
  const resolved = await resolveMediaAIContext({
    query: pick.title,
    mediaType: pick.mediaType
  });

  if (!resolved) {
    return {
      ...pick,
      href: `/search?q=${encodeURIComponent(pick.title)}&type=${pick.mediaType}`
    };
  }

  return {
    ...pick,
    tmdbId: resolved.context.tmdbId,
    href: resolved.href
  };
}

export async function resolveAIPicks<T extends { title: string; mediaType: MediaType }>(
  picks: T[]
) {
  return Promise.all(picks.map(resolveAIPick));
}

export function mapAIPickToRecommendation(pick: AIAssistantPick) {
  return {
    title: pick.title,
    mediaType: pick.mediaType,
    shortReason: pick.reason,
    comparableTitle: pick.comparableTitle,
    tmdbId: pick.tmdbId,
    href: pick.href
  };
}
