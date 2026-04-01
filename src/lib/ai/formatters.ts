import "server-only";

import { getAgeAccessForMedia } from "@/lib/age-gate/server";
import { getManyMediaAIContexts, resolveMediaAIContext } from "@/lib/ai/context";
import type { AIAssistantPick } from "@/lib/ai/types";
import type { Locale } from "@/lib/i18n/types";
import type { MediaType } from "@/types/media";

export async function resolveAIPick<T extends { title: string; mediaType: MediaType }>(
  pick: T,
  locale: Locale = "de"
) {
  const resolved = await resolveMediaAIContext({
    query: pick.title,
    mediaType: pick.mediaType,
    locale
  });

  if (!resolved) {
    return {
      ...pick,
      href: `/search?q=${encodeURIComponent(pick.title)}&type=${pick.mediaType}`
    };
  }

  return {
    ...pick,
    title: resolved.context.title,
    mediaType: resolved.context.mediaType,
    tmdbId: resolved.context.tmdbId,
    href: resolved.href
  };
}

export async function resolveAIPicks<T extends { title: string; mediaType: MediaType }>(
  picks: T[],
  locale: Locale = "de"
) {
  return Promise.all(picks.map(pick => resolveAIPick(pick, locale)));
}

export async function resolveAllowedAIPick<T extends { title: string; mediaType: MediaType }>(
  pick: T,
  locale: Locale = "de"
) {
  const resolved = await resolveMediaAIContext({
    query: pick.title,
    mediaType: pick.mediaType,
    locale
  });

  if (!resolved) {
    return null;
  }

  const access = await getAgeAccessForMedia(resolved.context.mediaType, resolved.context.tmdbId);

  if (!access.allowed) {
    return null;
  }

  return {
    ...pick,
    title: resolved.context.title,
    mediaType: resolved.context.mediaType,
    tmdbId: resolved.context.tmdbId,
    href: resolved.href
  };
}

export async function resolveAllowedAIPicks<T extends { title: string; mediaType: MediaType }>(
  picks: T[],
  locale: Locale = "de"
) {
  const resolved = await Promise.all(picks.map(pick => resolveAllowedAIPick(pick, locale)));

  return resolved.filter(Boolean) as Array<
    T & {
      tmdbId?: number;
      href: string;
    }
  >;
}

export async function filterAIPicksBySeasonCount<T extends { tmdbId: number; mediaType: MediaType }>(
  picks: T[],
  seasonCount: number,
  locale: Locale = "de"
) {
  if (!picks.length) {
    return picks;
  }

  const contexts = await getManyMediaAIContexts(
    picks.map(pick => ({
      tmdbId: pick.tmdbId,
      mediaType: pick.mediaType
    })),
    locale
  );

  return picks.filter((pick, index) => {
    if (pick.mediaType !== "tv") {
      return false;
    }

    return contexts[index]?.numberOfSeasons === seasonCount;
  });
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
