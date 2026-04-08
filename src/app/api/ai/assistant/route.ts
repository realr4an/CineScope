import { NextResponse } from "next/server";

import { getAgeAccessForMedia } from "@/lib/age-gate/server";
import {
  getManyMediaAIContexts,
  getPersonAIContext,
  resolvePersonAIContext,
  resolveMediaAIContext
} from "@/lib/ai/context";
import type { ResolveMediaHints } from "@/lib/ai/context";
import {
  filterAIPicksBySeasonCount,
  resolveAIPicks,
  resolveAllowedAIPicks
} from "@/lib/ai/formatters";
import { getDiscoverResults } from "@/lib/tmdb/discover";
import { searchMedia } from "@/lib/tmdb/search";
import {
  mapWatchProvidersForRegion,
  getMovieWatchProviders,
  getTvWatchProviders
} from "@/lib/tmdb/watch-providers";
import {
  DEFAULT_WATCH_REGION,
  WATCH_REGION_COOKIE_NAME,
  normalizeWatchRegionCode
} from "@/lib/tmdb/watch-provider-preference";
import { askOpenRouter, askOpenRouterJson, askOpenRouterJsonWithOptions } from "@/lib/ai/openrouter";
import { runAssistantSafetyGate, sanitizeAssistantInputText } from "@/lib/ai/assistant-guard";
import {
  assistantPrompt,
  comparePrompt,
  fitPrompt,
  personInsightsPrompt,
  priorityGroupsPrompt,
  priorityPrompt,
  titleInsightsPrompt
} from "@/lib/ai/prompts";
import {
  aiActionSchema,
  aiAssistantResponseSchema,
  aiCompareResponseSchema,
  aiFitResponseSchema,
  aiPersonInsightsResponseSchema,
  aiPriorityGroupsResponseSchema,
  aiPriorityResponseSchema,
  aiTitleInsightsResponseSchema
} from "@/lib/ai/schemas";
import { getLocaleFromCookieHeader } from "@/lib/i18n/request";
import type { Locale } from "@/lib/i18n/types";
import { containsPromptInjection } from "@/lib/security/prompt-injection";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRateLimitIdentityKey, getRequestIp, isSameOriginRequest } from "@/lib/security/request";
import { z, ZodError } from "zod";
import type { AITitleContext } from "@/lib/ai/types";

const MAX_ASSISTANT_SUGGESTIONS = 8;
const MAX_ASSISTANT_CONTEXT_MESSAGES = 10;
const WATCH_PROVIDER_GROUP_ORDER = ["flatrate", "free", "ads", "rent", "buy"] as const;
type EpisodeRuntimePreference = {
  mode: "around" | "max" | "min";
  minutes: number;
  tolerance: number;
};

function getCookieValue(cookieHeader: string | null | undefined, key: string) {
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === key) {
      return rawValue.join("=");
    }
  }

  return null;
}

function getPreferredWatchRegionFromCookieHeader(cookieHeader: string | null | undefined) {
  const rawValue = getCookieValue(cookieHeader, WATCH_REGION_COOKIE_NAME);
  return normalizeWatchRegionCode(rawValue) ?? DEFAULT_WATCH_REGION;
}

function getText(locale: Locale) {
  return locale === "en"
    ? {
        unresolved: "The title could not be resolved reliably.",
        blocked: "This title is not available for the stored age.",
        unresolvedOne: "At least one of the titles could not be resolved reliably.",
        invalidInput: "The AI request is invalid.",
        invalidPrompt: "Please provide a slightly more specific request.",
        invalidConversation:
          "The chat history is too long. Please try again and I will continue with recent messages.",
        aiActionFailed: "AI action failed",
        aiActionFailedFriendly: "The AI response could not be processed. Please try again.",
        maxSuggestionsInfo: "I can suggest up to 8 titles at once.",
        maxSuggestionsNext:
          "Tell me your mood, available time, or a reference title and I will suggest a concrete list.",
        cappedSuggestionsLead: (requested: number, capped: number, returned: number) =>
          returned < capped
            ? `You requested ${requested} titles. I can return up to ${capped} per answer, and found ${returned} suitable titles right now.`
            : `You requested ${requested} titles. I can return up to ${capped} titles per answer.`,
        cappedSuggestionsNext:
          "If you want more, ask for another batch and I will continue with additional suggestions.",
        exactSuggestionsLead: (count: number) =>
          `Here ${count === 1 ? "is" : "are"} ${count} suggestion${count === 1 ? "" : "s"} that fit.`,
        partialSuggestionsLead: (count: number, requested: number) =>
          `I found ${count} suitable title${count === 1 ? "" : "s"} (requested: ${requested}).`,
        partialSuggestionsNext:
          "If you want, I can broaden the criteria and try to reach your requested amount.",
        noSafePicksLead: "I could not return suitable titles with the current restrictions.",
        noSafePicksNext:
          "Try broader criteria (for example another genre, less strict constraints, or a different mood).",
        clarifyPreferencesLead:
          "Sure, I can suggest series. Before I generate picks: do you prefer a specific genre, mood, runtime, or intensity?",
        clarifyPreferencesNext:
          "For example: 'dark sci-fi', 'light comedy under 45 minutes', or 'thriller for two evenings'.",
        askDesiredCountLead:
          "Great, that helps. How many suggestions do you want right now?",
        askDesiredCountNext:
          "Tell me a number between 1 and 8, for example: '6 please'.",
        titleInfoNext:
          "Want similar titles next, or a quick fit-check against your taste?",
        titleInfoClarify:
          "I can do that. Please give me the exact title so I can answer reliably.",
        linkMissingLead:
          "I can share the link, but I need the exact title first.",
        linkMissingNext:
          "For example: 'Give me the link to One Punch Man'.",
        linkProvidedNext:
          "If you want, I can immediately suggest similar titles.",
        forbiddenOrigin: "Cross-origin requests are not allowed.",
        rateLimited: "Too many AI requests. Please try again in a moment.",
        unsafePrompt: "The request contains unsafe instruction patterns.",
        unsafePromptLead:
          "I cannot help with that request. I can assist with movies and series and safe recommendation questions.",
        unsafePromptNext:
          "Try asking something like: 'Recommend 6 dystopian sci-fi movies similar to Blade Runner.'"
      }
    : {
        unresolved: "Der Titel konnte nicht sicher aufgelöst werden.",
        blocked: "Dieser Titel ist für das hinterlegte Alter nicht verfügbar.",
        unresolvedOne: "Mindestens einer der Titel konnte nicht sicher aufgelöst werden.",
        invalidInput: "Die KI-Anfrage ist ungültig.",
        invalidPrompt: "Bitte formuliere deine Anfrage etwas genauer.",
        invalidConversation:
          "Der Chatverlauf ist zu lang. Bitte versuche es erneut, ich nutze dann die letzten Nachrichten.",
        aiActionFailed: "KI-Aktion fehlgeschlagen",
        aiActionFailedFriendly: "Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuche es erneut.",
        maxSuggestionsInfo: "Ich kann dir bis zu 8 Titel auf einmal vorschlagen.",
        maxSuggestionsNext:
          "Nenne mir Stimmung, Zeitbudget oder einen Referenztitel, dann schlage ich dir direkt eine Liste vor.",
        cappedSuggestionsLead: (requested: number, capped: number, returned: number) =>
          returned < capped
            ? `Du hast ${requested} Titel angefragt. Pro Antwort sind maximal ${capped} möglich, und aktuell habe ich ${returned} passende Titel gefunden.`
            : `Du hast ${requested} Titel angefragt. Pro Antwort sind maximal ${capped} möglich.`,
        cappedSuggestionsNext:
          "Wenn du mehr willst, frage nach der nächsten Runde, dann liefere ich weitere Vorschläge.",
        exactSuggestionsLead: (count: number) =>
          `Hier sind ${count} Vorschläge, die passen könnten.`,
        partialSuggestionsLead: (count: number, requested: number) =>
          `Ich habe ${count} passende Titel gefunden (angefragt: ${requested}).`,
        partialSuggestionsNext:
          "Wenn du möchtest, erweitere ich die Kriterien und versuche, die gewünschte Anzahl zu erreichen.",
        noSafePicksLead: "Ich konnte mit den aktuellen Einschränkungen keine passenden Titel sicher zurückgeben.",
        noSafePicksNext:
          "Versuche breitere Kriterien, zum Beispiel ein anderes Genre, weniger strenge Vorgaben oder eine andere Stimmung.",
        clarifyPreferencesLead:
          "Klar, ich schlage dir gern etwas vor. Bevor ich Titel nenne: Hast du Wünsche bei Genre, Stimmung, Laufzeit oder Intensität?",
        clarifyPreferencesNext:
          "Zum Beispiel: 'düstere Sci-Fi', 'leichte Komödie unter 45 Minuten' oder 'Thriller für zwei Abende'.",
        askDesiredCountLead:
          "Sehr gut, das hilft. Wie viele Vorschläge möchtest du jetzt?",
        askDesiredCountNext:
          "Nenne eine Zahl zwischen 1 und 8, zum Beispiel: '6 bitte'.",
        titleInfoNext:
          "Willst du als Nächstes ähnliche Titel oder einen kurzen Fit-Check zu deinem Geschmack?",
        titleInfoClarify:
          "Gern. Nenne mir bitte den genauen Titel, damit ich sicher dazu antworten kann.",
        linkMissingLead:
          "Ich kann den Link gern schicken, brauche dafür aber den genauen Titel.",
        linkMissingNext:
          "Zum Beispiel: 'Gib mir den Link zu One Punch Man'.",
        linkProvidedNext:
          "Wenn du möchtest, kann ich dir direkt ähnliche Titel dazu empfehlen.",
        forbiddenOrigin: "Cross-Origin-Anfragen sind nicht erlaubt.",
        rateLimited: "Zu viele KI-Anfragen. Bitte versuche es gleich erneut.",
        unsafePrompt: "Die Anfrage enthält unsichere Instruktionsmuster.",
        unsafePromptLead:
          "Dabei kann ich nicht helfen. Ich unterstütze dich bei Filmen, Serien und sicheren Empfehlungsanfragen.",
        unsafePromptNext:
          "Versuche zum Beispiel: 'Empfiehl mir 6 dystopische Sci-Fi-Filme ähnlich wie Blade Runner.'"
      };
}

function mapAssistantRuntimeError(error: unknown, locale: Locale) {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();

  if (error instanceof ZodError || normalized.includes("valid json") || normalized.includes("schema")) {
    return {
      status: 502,
      error:
        locale === "en"
          ? "The AI returned an unusable answer format. Please try the request again."
          : "Die KI hat kein brauchbares Antwortformat geliefert. Bitte versuche die Anfrage erneut."
    };
  }

  if (normalized.includes("timed out")) {
    return {
      status: 504,
      error:
        locale === "en"
          ? "The AI request took too long. Try a shorter or more specific request."
          : "Die KI-Anfrage hat zu lange gedauert. Versuche eine kuerzere oder konkretere Anfrage."
    };
  }

  if (normalized.includes("openrouter request failed: 429")) {
    return {
      status: 429,
      error:
        locale === "en"
          ? "The AI service is currently busy. Please try again in a moment."
          : "Der KI-Dienst ist gerade ausgelastet. Bitte versuche es gleich noch einmal."
    };
  }

  if (
    normalized.includes("openrouter request failed: 401") ||
    normalized.includes("openrouter request failed: 403") ||
    normalized.includes("openrouter_api_key fehlt") ||
    normalized.includes("openrouter request failed: 404")
  ) {
    return {
      status: 503,
      error:
        locale === "en"
          ? "The AI service is currently not configured correctly."
          : "Der KI-Dienst ist aktuell nicht korrekt konfiguriert."
    };
  }

  if (normalized.includes("openrouter request failed")) {
    return {
      status: 502,
      error:
        locale === "en"
          ? "The AI service could not complete the request right now."
          : "Der KI-Dienst konnte die Anfrage gerade nicht abschliessen."
    };
  }

  if (normalized.includes("tmdb request failed: 401") || normalized.includes("tmdb request failed: 403")) {
    return {
      status: 503,
      error:
        locale === "en"
          ? "Movie and series data are currently not configured correctly."
          : "Die Film- und Seriendaten sind aktuell nicht korrekt konfiguriert."
    };
  }

  if (normalized.includes("tmdb request failed")) {
    return {
      status: 502,
      error:
        locale === "en"
          ? "Movie and series data could not be loaded right now."
          : "Film- und Seriendaten konnten gerade nicht geladen werden."
    };
  }

  return {
    status: 500,
    error:
      locale === "en"
        ? "The AI request failed unexpectedly. Please try again."
        : "Die KI-Anfrage ist unerwartet fehlgeschlagen. Bitte versuche es erneut."
  };
}

function isStructuredAssistantFormatError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    error instanceof ZodError ||
    message.includes("valid json") ||
    message.includes("schema") ||
    message.includes("unexpected token") ||
    message.includes("json")
  );
}

async function getAssistantStructuredOrFallback(input: {
  prompt: string;
  locale: Locale;
  requestedPickCount: number;
}) {
  try {
    return await askOpenRouterJsonWithOptions(
      input.prompt,
      aiAssistantResponseSchema,
      {
        temperature: 0.6,
        maxTokens: 1200
      }
    );
  } catch (error) {
    if (!isStructuredAssistantFormatError(error)) {
      throw error;
    }

    const fallbackText = await askOpenRouter(
      [
        input.prompt,
        "",
        input.locale === "en"
          ? "Fallback mode: structured JSON failed. Answer as plain helpful chat text only."
          : "Fallback-Modus: Das strukturierte JSON ist fehlgeschlagen. Antworte nur als hilfreicher normaler Chat-Text.",
        input.locale === "en"
          ? `Do not output JSON. Do not invent pick cards. Keep it concise and natural. If you would normally give a list, summarize it in text and ask one focused follow-up question. Requested suggestion count: ${input.requestedPickCount}.`
          : `Gib kein JSON aus. Erfinde keine Kartenstruktur. Antworte knapp und natürlich. Wenn du normalerweise eine Liste geben würdest, fasse sie in Textform zusammen und stelle genau eine gezielte Rückfrage. Gewünschte Anzahl an Vorschlägen: ${input.requestedPickCount}.`
      ].join("\n"),
      {
        temperature: 0.45,
        maxTokens: 700
      }
    );

    return {
      intent: "chat" as const,
      lead: fallbackText.trim(),
      picks: [],
      nextStep:
        input.locale === "en"
          ? "If you want, I can narrow this down by genre, mood, runtime, or a reference title."
          : "Wenn du möchtest, grenze ich das nach Genre, Stimmung, Laufzeit oder einem Referenztitel weiter ein."
    };
  }
}

function isNoveltyRequest(input: {
  prompt?: string;
  conversation?: Array<{ content: string }>;
}) {
  const combined = [input.prompt ?? "", ...(input.conversation ?? []).map(message => message.content)]
    .join(" \n ")
    .toLowerCase();

  return (
    /\bneu(?:e|en|er|es)?\b/.test(combined) ||
    /\bnew\b/.test(combined) ||
    /noch nicht/.test(combined) ||
    /something else|something new|andere|anderes|andere titel/.test(combined)
  );
}

function normalizeAssistantTitleValue(value: string | null | undefined) {
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

function extractPreviouslySuggestedTitles(
  conversation: Array<{ role: "user" | "assistant"; content: string }>
) {
  const titles = new Set<string>();

  for (const message of conversation) {
    if (message.role !== "assistant") {
      continue;
    }

    const markerMatch = message.content.match(/suggested titles:\s*(.+)$/im);
    if (!markerMatch?.[1]) {
      continue;
    }

    for (const rawTitle of markerMatch[1].split("|")) {
      const normalized = normalizeAssistantTitleValue(rawTitle);
      if (normalized) {
        titles.add(normalized);
      }
    }
  }

  return titles;
}

function extractMostRecentSuggestedTitles(
  conversation: Array<{ role: "user" | "assistant"; content: string }>
) {
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const message = conversation[index];
    if (!message || message.role !== "assistant") {
      continue;
    }

    const markerMatch = message.content.match(/suggested titles:\s*(.+)$/im);
    if (!markerMatch?.[1]) {
      continue;
    }

    const orderedTitles = markerMatch[1]
      .split("|")
      .map(rawTitle => rawTitle.trim())
      .filter(Boolean);

    if (orderedTitles.length) {
      return orderedTitles;
    }
  }

  return [] as string[];
}

function findSuggestedTitleMentionInPrompt(prompt: string, suggestedTitles: string[]) {
  const normalizedPrompt = normalizeAssistantTitleValue(prompt);
  if (!normalizedPrompt) {
    return null;
  }

  for (const title of suggestedTitles) {
    const normalizedTitle = normalizeAssistantTitleValue(title);

    if (!normalizedTitle) {
      continue;
    }

    if (normalizedPrompt.includes(normalizedTitle) || normalizedTitle.includes(normalizedPrompt)) {
      return title;
    }

    const promptTokens = normalizedPrompt.split(" ").filter(Boolean);
    const titleTokens = normalizedTitle.split(" ").filter(Boolean);
    const overlap = promptTokens.filter(token => titleTokens.includes(token)).length;

    if (overlap >= 1 && titleTokens.length <= 4) {
      return title;
    }
  }

  return null;
}

function isRecentListDecisionFollowUp(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\b(welche(?:s|n)? davon|davon|aus der liste|von den genannten|welche würdest du|was davon)\b/.test(
      normalized
    ) ||
    /\b(which (?:one|ones|of those)|from that list|from the list|which would you recommend)\b/.test(
      normalized
    )
  );
}

function getDesiredShortlistCount(prompt: string, available: number) {
  const parsed = parseRequestedCount(prompt);
  if (parsed !== null) {
    return clamp(parsed, 1, Math.min(5, available));
  }

  const normalized = prompt.toLowerCase();
  if (/\b(welche|which one|best|am besten)\b/.test(normalized)) {
    return Math.min(1, available);
  }

  return Math.min(3, available);
}

function scoreContextForShortlist(context: AITitleContext) {
  const rating = context.rating ?? 0;
  const voteCount = context.voteCount ?? 0;
  return rating * 1000 + Math.min(voteCount, 200000);
}

function buildShortlistReason(rank: number, locale: Locale) {
  if (locale === "en") {
    if (rank === 0) {
      return "From your recent shortlist, this is the strongest overall fit to start with.";
    }
    if (rank === 1) {
      return "Great follow-up choice from the same shortlist with similarly strong appeal.";
    }
    return "Solid option from your shortlist if you want another title in the same direction.";
  }

  if (rank === 0) {
    return "Aus deiner letzten Liste ist das der stärkste Gesamtfit als nächster Startpunkt.";
  }
  if (rank === 1) {
    return "Sehr gute Anschlusswahl aus derselben Liste mit ähnlich starkem Profil.";
  }
  return "Solide Option aus deiner Liste, wenn du noch einen ähnlichen Titel willst.";
}

type RecentListQualifier = "anime" | "live_action" | "movie" | "series";

function extractRecentListQualifier(prompt: string): RecentListQualifier | null {
  const normalized = prompt.toLowerCase();

  if (/\b(anime|animiert|animated|zeichentrick|trickfilm)\b/.test(normalized)) {
    return "anime";
  }

  if (/\b(live[\s-]?action|realverfilmung|echte menschen|mit echten menschen)\b/.test(normalized)) {
    return "live_action";
  }

  if (/\b(film|movie|movies|filme)\b/.test(normalized)) {
    return "movie";
  }

  if (/\b(serie|serien|show|shows|tv)\b/.test(normalized)) {
    return "series";
  }

  return null;
}

function matchesRecentListQualifier(
  context: AITitleContext,
  qualifier: RecentListQualifier
) {
  const normalizedGenres = context.genres.map(genre => normalizeTitleForLookup(genre));
  const isAnimation = normalizedGenres.includes("animation");

  switch (qualifier) {
    case "anime":
      return isAnimation;
    case "live_action":
      return !isAnimation;
    case "movie":
      return context.mediaType === "movie";
    case "series":
      return context.mediaType === "tv";
    default:
      return false;
  }
}

function buildRecentListQualifierLead(
  qualifier: RecentListQualifier,
  matches: AITitleContext[],
  locale: Locale
) {
  const titles = matches.map(item => item.title);

  if (locale === "en") {
    if (qualifier === "anime") {
      return matches.length === 1
        ? `${titles[0]} is the anime from that list.`
        : `These are the anime titles from that list: ${titles.join(", ")}.`;
    }
    if (qualifier === "live_action") {
      return matches.length === 1
        ? `${titles[0]} is the live-action title from that list.`
        : `These are the live-action titles from that list: ${titles.join(", ")}.`;
    }
    if (qualifier === "movie") {
      return matches.length === 1
        ? `${titles[0]} is the movie from that list.`
        : `These are the movies from that list: ${titles.join(", ")}.`;
    }

    return matches.length === 1
      ? `${titles[0]} is the series from that list.`
      : `These are the series from that list: ${titles.join(", ")}.`;
  }

  if (qualifier === "anime") {
    return matches.length === 1
      ? `${titles[0]} ist der Anime aus dieser Liste.`
      : `Das sind die Anime-Titel aus dieser Liste: ${titles.join(", ")}.`;
  }
  if (qualifier === "live_action") {
    return matches.length === 1
      ? `${titles[0]} ist die Live-Action-Version aus dieser Liste.`
      : `Das sind die Live-Action-Titel aus dieser Liste: ${titles.join(", ")}.`;
  }
  if (qualifier === "movie") {
    return matches.length === 1
      ? `${titles[0]} ist der Film aus dieser Liste.`
      : `Das sind die Filme aus dieser Liste: ${titles.join(", ")}.`;
  }

  return matches.length === 1
    ? `${titles[0]} ist die Serie aus dieser Liste.`
    : `Das sind die Serien aus dieser Liste: ${titles.join(", ")}.`;
}

function parseLeadCount(input: string) {
  const normalized = input.toLowerCase();
  const digitMatch = normalized.match(/(?:^|\s)(\d{1,2})(?:\s|$)/);
  if (digitMatch) {
    return Number(digitMatch[1]);
  }

  const wordMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eins: 1,
    eine: 1,
    einen: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    funf: 5,
    fünf: 5,
    sechs: 6,
    sieben: 7,
    acht: 8,
    neun: 9,
    zehn: 10
  };

  for (const [word, value] of Object.entries(wordMap)) {
    if (new RegExp(`(^|\\s)${word}(\\s|$)`, "i").test(normalized)) {
      return value;
    }
  }

  return null;
}

function getYearFromDate(value: string | null | undefined) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const year = Number(value.slice(0, 4));
  return Number.isFinite(year) ? year : Number.MAX_SAFE_INTEGER;
}

function buildFallbackPriorityGroups(titles: AITitleContext[], locale: Locale) {
  const mediaTypeLabel =
    locale === "en"
      ? { movie: "Movies", tv: "Series", mixed: "Mixed picks" }
      : { movie: "Filme", tv: "Serien", mixed: "Gemischte Auswahl" };
  const fallbackReason =
    locale === "en"
      ? "Sorted in a sensible order based on genre and release year."
      : "Sinnvoll nach Genre und Erscheinungsjahr sortiert.";
  const summary =
    locale === "en"
      ? "AI grouping was unavailable for this request. A deterministic watchlist grouping is shown instead."
      : "Die KI-Gruppierung war für diese Anfrage nicht verfügbar. Stattdessen wird eine stabile, regelbasierte Gruppierung angezeigt.";
  const sorted = [...titles].sort((left, right) => {
    const yearDelta = getYearFromDate(left.releaseDate) - getYearFromDate(right.releaseDate);
    if (yearDelta !== 0) {
      return yearDelta;
    }

    return left.title.localeCompare(right.title);
  });
  const groupsByLabel = new Map<
    string,
    Array<{
      title: string;
      mediaType: "movie" | "tv";
      reason: string;
      tmdbId: number;
      href: string;
    }>
  >();

  for (const title of sorted) {
    const label =
      title.genres[0]?.trim() ||
      (title.mediaType === "movie" ? mediaTypeLabel.movie : mediaTypeLabel.tv) ||
      mediaTypeLabel.mixed;
    const current = groupsByLabel.get(label) ?? [];
    current.push({
      title: title.title,
      mediaType: title.mediaType,
      reason: fallbackReason,
      tmdbId: title.tmdbId,
      href: `/${title.mediaType}/${title.tmdbId}`
    });
    groupsByLabel.set(label, current);
  }

  const groups = Array.from(groupsByLabel.entries()).map(([label, items]) => ({
    label,
    items
  }));

  return {
    summary,
    groups
  };
}

function normalizeTitleForLookup(value: string | null | undefined) {
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

function tokenizeLookupValue(value: string | null | undefined) {
  return normalizeTitleForLookup(value)
    .split(" ")
    .filter(Boolean);
}

function inferTitleInfoMediaType(
  prompt: string,
  preferred: "all" | "movie" | "tv"
) {
  if (preferred !== "all") {
    return preferred;
  }

  const normalized = prompt.toLowerCase();
  if (/\b(serie|serien|show|shows|tv|episode|episoden?|folgen?)\b/.test(normalized)) {
    return "tv" as const;
  }

  if (/\b(film|filme|movie|movies|kino)\b/.test(normalized)) {
    return "movie" as const;
  }

  return "all" as const;
}

function inferTitleResolutionHints(
  prompt: string,
  conversation: Array<{ role: "user" | "assistant"; content: string }> = []
): ResolveMediaHints | undefined {
  const current = prompt.toLowerCase();
  const recentConversation = conversation
    .slice(-6)
    .map(message => message.content.toLowerCase())
    .join(" ");

  const animationPattern =
    /\b(anime|animation|animiert|animated|zeichentrick|trickfilm|manga)\b/;
  const liveActionPattern =
    /\b(live[\s-]?action|realverfilmung|mit echten menschen|echte menschen|真人)\b/;
  const japanesePattern = /\b(japan|japanisch|japanese)\b/;

  const currentWantsLiveAction = liveActionPattern.test(current);
  const currentWantsAnimation = animationPattern.test(current);
  const conversationSuggestsAnimation = animationPattern.test(recentConversation);
  const conversationSuggestsJapanese = japanesePattern.test(recentConversation);

  const preferLiveAction = currentWantsLiveAction;
  const preferAnimation =
    currentWantsAnimation || (!currentWantsLiveAction && conversationSuggestsAnimation);
  const preferJapanese =
    preferAnimation ||
    japanesePattern.test(current) ||
    (!currentWantsLiveAction && conversationSuggestsJapanese);

  if (!preferAnimation && !preferLiveAction && !preferJapanese) {
    return undefined;
  }

  return {
    preferAnimation,
    preferLiveAction,
    preferJapanese
  };
}

function isLatestReleaseIntent(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\b(neuste[nrsm]?|neueste[nrsm]?|aktuellste[nrsm]?|ganz neue[nrsm]?|brandneue[nrsm]?)\b/.test(
      normalized
    ) ||
    /\b(latest|newest|most recent|recently released)\b/.test(normalized)
  );
}

function inferDiscoverMediaType(
  prompt: string,
  preferred: "all" | "movie" | "tv"
) {
  if (preferred !== "all") {
    return preferred;
  }

  const normalized = prompt.toLowerCase();

  if (/\b(film|filme|movie|movies|kino)\b/.test(normalized)) {
    return "movie" as const;
  }

  if (/\b(serie|serien|show|shows|tv)\b/.test(normalized)) {
    return "tv" as const;
  }

  return "all" as const;
}

function buildMediaKey(mediaType: "movie" | "tv", tmdbId: number) {
  return `${mediaType}:${tmdbId}`;
}

function compactOverviewForChat(overview: string | null | undefined) {
  const normalized = (overview ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
  const short = sentences.slice(0, 2).join(" ").trim();

  return short.length > 320 ? `${short.slice(0, 317).trimEnd()}...` : short;
}

function isStreamingAvailabilityPrompt(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\b(streaming|streamen|streambar|watch provider|where to watch|anbieter|anbietern|wo schauen|wo gucken|verf[uü]gbar)\b/.test(
      normalized
    ) ||
    /\b(netflix|prime video|amazon prime|disney\+|disney plus|wow|sky|apple tv|hulu|paramount\+|rtl\+)\b/.test(
      normalized
    )
  );
}

function isComprehensiveTitleInfoRequest(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\b(alle infos|alle informationen|alles [uü]ber|komplette infos|vollst[aä]ndige infos|full details|all details|all info|everything about)\b/.test(
      normalized
    )
  );
}

async function buildWhereToWatchSummaryForTitle(
  title: AITitleContext,
  locale: Locale,
  regionCode: string
) {
  try {
    const rawResponse =
      title.mediaType === "movie"
        ? await getMovieWatchProviders(title.tmdbId)
        : await getTvWatchProviders(title.tmdbId);
    const mapped = mapWatchProvidersForRegion(rawResponse, regionCode);
    const regionLabel = mapped.regionName || mapped.regionCode;
    const labels =
      locale === "en"
        ? {
            flatrate: "Subscription",
            free: "Free",
            ads: "With ads",
            rent: "Rent",
            buy: "Buy"
          }
        : {
            flatrate: "Im Abo",
            free: "Kostenlos",
            ads: "Mit Werbung",
            rent: "Leihen",
            buy: "Kaufen"
          };

    const segments = WATCH_PROVIDER_GROUP_ORDER.map(group => {
      const providers = mapped[group];
      if (!providers.length) {
        return null;
      }

      const names = providers
        .slice(0, 4)
        .map(provider => provider.providerName)
        .join(", ");
      return `${labels[group]}: ${names}.`;
    }).filter((segment): segment is string => Boolean(segment));

    if (!segments.length) {
      return locale === "en"
        ? `Where to watch (${regionLabel}): no providers are currently listed in TMDB.`
        : `Where to watch (${regionLabel}): aktuell sind in TMDB keine Anbieter hinterlegt.`;
    }

    const tmdbLink = mapped.link
      ? locale === "en"
        ? `TMDB link: ${mapped.link}.`
        : `TMDB-Link: ${mapped.link}.`
      : null;

    return [
      locale === "en"
        ? `Where to watch in ${regionLabel}:`
        : `Where to watch in ${regionLabel}:`,
      ...segments,
      tmdbLink
    ]
      .filter(Boolean)
      .join(" ");
  } catch {
    return locale === "en"
      ? "Where-to-watch data could not be loaded right now."
      : "Where-to-watch-Daten konnten gerade nicht geladen werden.";
  }
}

function buildTitleInfoLead(title: AITitleContext, locale: Locale) {
  const overview = compactOverviewForChat(title.overview);
  const genres = title.genres.slice(0, 3).join(", ");
  const typeLabel =
    locale === "en"
      ? title.mediaType === "tv"
        ? "series"
        : "movie"
      : title.mediaType === "tv"
        ? "Serie"
        : "Film";
  const base = locale === "en" ? `${title.title} is a ${typeLabel}.` : `${title.title} ist ein ${typeLabel}.`;
  const summary =
    overview ||
    (locale === "en"
      ? "I do not have a detailed synopsis in the current data snapshot."
      : "Ich habe aktuell keine ausführliche Inhaltsbeschreibung im Datensatz.");

  const details: string[] = [];
  if (genres) {
    details.push(`Genres: ${genres}.`);
  }

  if (title.mediaType === "tv" && title.runtime) {
    details.push(
      locale === "en"
        ? `Typical runtime: about ${title.runtime} minutes per episode.`
        : `Typische Laufzeit: etwa ${title.runtime} Minuten pro Folge.`
    );
  }

  if (title.mediaType === "tv" && title.numberOfSeasons) {
    details.push(
      locale === "en"
        ? `Current seasons: ${title.numberOfSeasons}.`
        : `Aktuelle Staffeln: ${title.numberOfSeasons}.`
    );
  }

  return `${base} ${summary}${details.length ? ` ${details.join(" ")}` : ""}`.trim();
}

function buildExtendedTitleInfoLead(title: AITitleContext, locale: Locale) {
  const overview = compactOverviewForChat(title.overview);
  const parts: string[] = [
    locale === "en"
      ? `${title.title} is a ${title.mediaType === "tv" ? "series" : "movie"}.`
      : `${title.title} ist ${title.mediaType === "tv" ? "eine Serie" : "ein Film"}.`
  ];

  if (overview) {
    parts.push(overview);
  }

  if (title.genres.length) {
    parts.push(
      locale === "en"
        ? `Genres: ${title.genres.slice(0, 5).join(", ")}.`
        : `Genres: ${title.genres.slice(0, 5).join(", ")}.`
    );
  }

  if (title.mediaType === "tv") {
    if (title.runtime) {
      parts.push(
        locale === "en"
          ? `Typical runtime is around ${title.runtime} minutes per episode.`
          : `Die typische Laufzeit liegt bei etwa ${title.runtime} Minuten pro Folge.`
      );
    }
    if (title.numberOfSeasons) {
      parts.push(
        locale === "en"
          ? `It currently has ${title.numberOfSeasons} season${title.numberOfSeasons === 1 ? "" : "s"}.`
          : `Aktuell hat die Serie ${title.numberOfSeasons} Staffel${title.numberOfSeasons === 1 ? "" : "n"}.`
      );
    }
  } else if (title.runtime) {
    parts.push(
      locale === "en"
        ? `Runtime is about ${title.runtime} minutes.`
        : `Die Laufzeit beträgt etwa ${title.runtime} Minuten.`
    );
  }

  if (title.cast?.length) {
    parts.push(
      locale === "en"
        ? `Main cast includes ${title.cast.slice(0, 5).join(", ")}.`
        : `Wichtige Besetzung: ${title.cast.slice(0, 5).join(", ")}.`
    );
  }

  return parts.join(" ");
}

async function buildComprehensiveTitleInfoLead(
  title: AITitleContext,
  locale: Locale,
  regionCode: string
) {
  const parts: string[] = [buildExtendedTitleInfoLead(title, locale)];

  if (title.tagline) {
    parts.push(locale === "en" ? `Tagline: ${title.tagline}.` : `Tagline: ${title.tagline}.`);
  }

  if (title.releaseDate) {
    parts.push(
      locale === "en"
        ? `Release date: ${title.releaseDate}.`
        : `Erscheinungsdatum: ${title.releaseDate}.`
    );
  }

  if (typeof title.rating === "number") {
    const rating = title.rating.toFixed(1);
    const votes = title.voteCount?.toLocaleString(locale === "en" ? "en-US" : "de-DE");
    parts.push(
      locale === "en"
        ? `Rating: ${rating}/10${votes ? ` (${votes} votes)` : ""}.`
        : `Bewertung: ${rating}/10${votes ? ` (${votes} Stimmen)` : ""}.`
    );
  }

  if (title.spokenLanguages?.length) {
    parts.push(
      locale === "en"
        ? `Spoken languages: ${title.spokenLanguages.slice(0, 8).join(", ")}.`
        : `Gesprochene Sprachen: ${title.spokenLanguages.slice(0, 8).join(", ")}.`
    );
  }

  if (title.networks?.length) {
    parts.push(
      locale === "en"
        ? `Networks/platforms: ${title.networks.slice(0, 6).join(", ")}.`
        : `Sender/Plattformen: ${title.networks.slice(0, 6).join(", ")}.`
    );
  }

  parts.push(await buildWhereToWatchSummaryForTitle(title, locale, regionCode));

  return parts.join(" ");
}

function buildPersonInfoLead(input: {
  name: string;
  knownForDepartment: string | null;
  biography: string;
  placeOfBirth: string | null;
  birthday: string | null;
  topCredits: Array<{ title: string; mediaType: "movie" | "tv" }>;
  locale: Locale;
}) {
  const parts: string[] = [];
  const isEn = input.locale === "en";
  const bio = compactOverviewForChat(input.biography);
  const credits = input.topCredits
    .slice(0, 5)
    .map(credit => `${credit.title}${credit.mediaType === "tv" ? " (Serie)" : ""}`)
    .join(", ");

  parts.push(
    isEn
      ? `${input.name} is primarily known for ${input.knownForDepartment ?? "acting"}.`
      : `${input.name} ist vor allem bekannt für ${input.knownForDepartment ?? "Schauspiel"}.`
  );

  if (bio) {
    parts.push(bio);
  }

  if (input.birthday) {
    parts.push(
      isEn
        ? `Birthday: ${input.birthday}.`
        : `Geboren: ${input.birthday}.`
    );
  }

  if (input.placeOfBirth) {
    parts.push(
      isEn
        ? `Place of birth: ${input.placeOfBirth}.`
        : `Geburtsort: ${input.placeOfBirth}.`
    );
  }

  if (credits) {
    parts.push(
      isEn
        ? `Notable titles: ${credits}.`
        : `Bekannte Titel: ${credits}.`
    );
  }

  return parts.join(" ");
}

function isWeakTitleInfoLead(lead: string, locale: Locale) {
  const normalized = lead.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const generic =
    locale === "en"
      ? [
          "here is some information",
          "here are some details",
          "want similar titles"
        ]
      : [
          "hier sind einige informationen",
          "hier sind ein paar informationen",
          "möchtest du mehr",
          "moechtest du mehr"
        ];

  if (normalized.length < 90) {
    return true;
  }

  return generic.some(fragment => normalized.includes(fragment));
}

async function buildTitleDetailLead(
  title: AITitleContext,
  prompt: string,
  locale: Locale,
  regionCode: string
) {
  const normalized = prompt.toLowerCase();
  const unknown =
    locale === "en"
      ? "I do not have that detail in the current data snapshot."
      : "Dazu habe ich im aktuellen Datensatz keine verlässliche Angabe.";

  if (isStreamingAvailabilityPrompt(normalized)) {
    return buildWhereToWatchSummaryForTitle(title, locale, regionCode);
  }

  if (
    /\b(wie lange|laufzeit|folgenl[aä]nge|episode length|runtime|how long|minutes?)\b/.test(
      normalized
    )
  ) {
    if (title.mediaType === "tv") {
      if (title.runtime) {
        return locale === "en"
          ? `The episodes of ${title.title} are usually about ${title.runtime} minutes long.`
          : `Die Folgen von ${title.title} dauern in der Regel etwa ${title.runtime} Minuten.`;
      }

      return locale === "en"
        ? `I could not find a reliable average episode runtime for ${title.title}.`
        : `Ich konnte keine verlässliche durchschnittliche Folgenlänge für ${title.title} finden.`;
    }

    return title.runtime
      ? locale === "en"
        ? `${title.title} is a movie with a runtime of about ${title.runtime} minutes.`
        : `${title.title} ist ein Film mit etwa ${title.runtime} Minuten Laufzeit.`
      : unknown;
  }

  if (/\b(staffeln?|seasons?)\b/.test(normalized)) {
    if (title.mediaType === "tv" && title.numberOfSeasons) {
      return locale === "en"
        ? `${title.title} currently has ${title.numberOfSeasons} season${title.numberOfSeasons === 1 ? "" : "s"}.`
        : `${title.title} hat aktuell ${title.numberOfSeasons} Staffel${title.numberOfSeasons === 1 ? "" : "n"}.`;
    }

    return unknown;
  }

  if (/\b(episoden?|episodes?)\b/.test(normalized)) {
    if (title.mediaType === "tv" && title.numberOfEpisodes) {
      return locale === "en"
        ? `${title.title} currently has ${title.numberOfEpisodes} episode${title.numberOfEpisodes === 1 ? "" : "s"} in total.`
        : `${title.title} hat aktuell insgesamt ${title.numberOfEpisodes} Episode${title.numberOfEpisodes === 1 ? "" : "n"}.`;
    }

    return unknown;
  }

  if (/\b(genre|genres?|kategorie|kategorien)\b/.test(normalized)) {
    const genres = title.genres.slice(0, 5).join(", ");
    return genres
      ? locale === "en"
        ? `${title.title} is mainly in these genres: ${genres}.`
        : `${title.title} ist vor allem in diesen Genres einzuordnen: ${genres}.`
      : unknown;
  }

  if (/\b(besetzung|cast|schauspieler|actors?)\b/.test(normalized)) {
    const cast = title.cast?.slice(0, 6).join(", ");
    return cast
      ? locale === "en"
        ? `Main cast for ${title.title}: ${cast}.`
        : `Wichtige Besetzung bei ${title.title}: ${cast}.`
      : unknown;
  }

  if (/\b(sprachen?|languages?)\b/.test(normalized)) {
    const languages = title.spokenLanguages?.slice(0, 6).join(", ");
    return languages
      ? locale === "en"
        ? `Available spoken languages in the metadata for ${title.title}: ${languages}.`
        : `Im Datensatz hinterlegte gesprochene Sprachen für ${title.title}: ${languages}.`
      : unknown;
  }

  if (/\b(network|sender|plattform|platform)\b/.test(normalized)) {
    const networks = title.networks?.slice(0, 5).join(", ");
    return networks
      ? locale === "en"
        ? `${title.title} is associated with these networks/platforms: ${networks}.`
        : `${title.title} ist mit diesen Sendern/Plattformen verknüpft: ${networks}.`
      : unknown;
  }

  if (/\b(ausführlicher|ausfuehrlicher|mehr details|mehr dazu|more details|tell me more)\b/.test(normalized)) {
    return buildComprehensiveTitleInfoLead(title, locale, regionCode);
  }

  return null;
}

function pickReferenceForTitleQuery(
  references: AITitleContext[],
  titleQuery: string | null,
  preferredMediaType: "all" | "movie" | "tv" = "all",
  hints?: ResolveMediaHints
) {
  if (!titleQuery) {
    return references[0] ?? null;
  }

  const query = normalizeTitleForLookup(titleQuery);
  if (!query) {
    return references[0] ?? null;
  }

  const queryTokens = tokenizeLookupValue(query);
  const ranked = references
    .map(reference => {
      const title = normalizeTitleForLookup(reference.title);
      const original = normalizeTitleForLookup(reference.originalTitle);
      const titleTokens = tokenizeLookupValue(title);
      const originalTokens = tokenizeLookupValue(original);

      let score = 0;
      if (title === query || original === query) {
        score += 160;
      } else if (title.startsWith(query) || original.startsWith(query)) {
        score += 120;
      } else if (title.includes(query) || original.includes(query)) {
        score += 90;
      }

      if (queryTokens.length) {
        const titleOverlap = queryTokens.filter(token => titleTokens.includes(token)).length;
        const originalOverlap = queryTokens.filter(token => originalTokens.includes(token)).length;
        score += Math.round((Math.max(titleOverlap, originalOverlap) / queryTokens.length) * 70);
      }

      if (preferredMediaType !== "all" && reference.mediaType === preferredMediaType) {
        score += 25;
      }

      const normalizedGenres = reference.genres.map(genre => normalizeTitleForLookup(genre));
      if (hints?.preferAnimation) {
        score += normalizedGenres.includes("animation") ? 45 : -35;
      }

      if (hints?.preferLiveAction) {
        score += normalizedGenres.includes("animation") ? -55 : 18;
      }

      score += Math.min(18, Math.floor((reference.voteCount ?? 0) / 5_000));

      return { reference, score };
    })
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.reference ?? references[0] ?? null;
}

function dedupeAndNormalizePriorityGroups(
  groups: Array<{
    label: string;
    description?: string;
    items: Array<{
      title: string;
      mediaType: "movie" | "tv";
      reason: string;
      tmdbId?: number;
      href?: string;
    }>;
  }>,
  titles: AITitleContext[],
  locale: Locale
) {
  const allowedByKey = new Map(
    titles.map(title => [buildMediaKey(title.mediaType, title.tmdbId), title])
  );
  const titleToKey = new Map<string, string>();

  for (const title of titles) {
    const key = buildMediaKey(title.mediaType, title.tmdbId);
    const normalizedMain = normalizeTitleForLookup(title.title);

    if (normalizedMain) {
      titleToKey.set(`${title.mediaType}:${normalizedMain}`, key);
    }

    const normalizedOriginal = normalizeTitleForLookup(title.originalTitle);
    if (normalizedOriginal) {
      titleToKey.set(`${title.mediaType}:${normalizedOriginal}`, key);
    }
  }

  const seen = new Set<string>();
  const normalizedGroups = groups
    .map(group => {
      const items = group.items
        .map(item => {
          const directKey =
            typeof item.tmdbId === "number" ? buildMediaKey(item.mediaType, item.tmdbId) : null;
          const fallbackKey = titleToKey.get(
            `${item.mediaType}:${normalizeTitleForLookup(item.title)}`
          );
          const key = directKey && allowedByKey.has(directKey) ? directKey : fallbackKey;

          if (!key || seen.has(key)) {
            return null;
          }

          const context = allowedByKey.get(key);
          if (!context) {
            return null;
          }

          seen.add(key);

          return {
            ...item,
            title: context.title,
            mediaType: context.mediaType,
            tmdbId: context.tmdbId,
            href: `/${context.mediaType}/${context.tmdbId}`
          };
        })
        .filter(Boolean) as Array<{
        title: string;
        mediaType: "movie" | "tv";
        reason: string;
        tmdbId: number;
        href: string;
      }>;

      return {
        ...group,
        items
      };
    })
    .filter(group => group.items.length > 0);

  const missing = titles.filter(
    title => !seen.has(buildMediaKey(title.mediaType, title.tmdbId))
  );

  if (missing.length) {
    normalizedGroups.push({
      label: locale === "en" ? "Other picks" : "Weitere Vorschläge",
      items: missing.map(title => ({
        title: title.title,
        mediaType: title.mediaType,
        reason:
          locale === "en"
            ? "Added to keep every watchlist title represented exactly once."
            : "Hinzugefügt, damit jeder Watchlist-Titel genau einmal enthalten ist.",
        tmdbId: title.tmdbId,
        href: `/${title.mediaType}/${title.tmdbId}`
      }))
    });
  }

  return normalizedGroups;
}

function formatValidationError(
  fieldErrors: Record<string, string[] | undefined>,
  formErrors: string[],
  fallback: string,
  promptFallback: string,
  conversationFallback: string
) {
  if (fieldErrors.prompt?.length) {
    return promptFallback;
  }

  if (fieldErrors.conversation?.length) {
    return conversationFallback;
  }

  const firstFormError = formErrors.find(Boolean);
  if (firstFormError) {
    return firstFormError;
  }

  const firstFieldError = Object.values(fieldErrors).flat().find(Boolean);
  return firstFieldError ?? fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseRequestedCount(input: string) {
  const normalized = input.toLowerCase();
  const wordToNumber: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eins: 1,
    eine: 1,
    einen: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    funf: 5,
    fünf: 5,
    sechs: 6,
    sieben: 7,
    acht: 8,
    neun: 9,
    zehn: 10
  };
  const wordAlternation = Object.keys(wordToNumber)
    .sort((left, right) => right.length - left.length)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const countNounAlternation =
    "filme?|series?|movies?|serien?|anime|animes?|shows?|titel|title|vorschl[aä]ge?|picks?|trickfilme?|zeichentrick(?:filme?)?|cartoons?|animationsfilme?";

  const shortNumericRequestMatch = normalized.match(
    /^(?:[a-zäöüß.,!? ]{0,20})?(\d{1,2})(?:\s*(?:bitte|please|mehr|noch|titel|filme?|serien?|movies?|series?|anime|animes?|shows?|picks?|vorschl[aä]ge?))?[.!? ]*$/i
  );

  if (shortNumericRequestMatch) {
    return Number(shortNumericRequestMatch[1]);
  }

  const trailingPleaseMatch = normalized.match(
    /(?:^|\s)(\d{1,2})(?=\s*(?:bitte|please)(?:\s|$))/i
  );

  if (trailingPleaseMatch) {
    return Number(trailingPleaseMatch[1]);
  }

  const nounDigitMatch = normalized.match(
    new RegExp(
      `(?:^|\\s)(\\d{1,2})\\s*(?:${countNounAlternation})(?:\\s|$)`,
      "i"
    )
  );

  if (nounDigitMatch) {
    return Number(nounDigitMatch[1]);
  }

  const quantifiedNounDigitMatch = normalized.match(
    new RegExp(
      `(?:^|\\s)(\\d{1,2})\\s*(?:neue?n?|weitere?n?|more|extra|zus[aä]tzliche?n?|st[uü]ck|stücke|items?)?\\s*(?:${countNounAlternation})(?:\\s|$)`,
      "i"
    )
  );

  if (quantifiedNounDigitMatch) {
    return Number(quantifiedNounDigitMatch[1]);
  }

  const requestDigitMatch = normalized.match(
    /(?:kannst\s+du|can\s+you|please|bitte|auch)\D{0,12}(\d{1,2})(?:\s|$)/
  );

  if (requestDigitMatch) {
    return Number(requestDigitMatch[1]);
  }

  const actionDigitMatch = normalized.match(
    /(?:gib(?:\s+mir)?|give(?:\s+me)?|empf(?:iehl)?|recommend|suggest|schlag(?:\s+mir)?(?:\s+vor)?)\D{0,20}(\d{1,2})(?:\s|$)/
  );

  if (actionDigitMatch) {
    const nearby = normalized.slice(
      Math.max(0, actionDigitMatch.index ?? 0),
      Math.min(normalized.length, (actionDigitMatch.index ?? 0) + 50)
    );
    if (!/\b(min(?:ute|uten)?|minutes?|folge|folgen|episode|episoden|staffel|staffeln|jahr|jahre|year|years)\b/.test(nearby)) {
      return Number(actionDigitMatch[1]);
    }
  }

  const nounWordMatch = normalized.match(
    new RegExp(
      `(?:^|\\s)(${wordAlternation})\\s*(?:neue?n?|weitere?n?|more|extra|zus[aä]tzliche?n?|st[uü]ck|stücke|items?)?\\s*(?:${countNounAlternation})(?:\\s|$)`,
      "i"
    )
  );

  if (nounWordMatch?.[1]) {
    const matchedWord = nounWordMatch[1].toLowerCase();
    const count = wordToNumber[matchedWord];
    if (typeof count === "number") {
      return count;
    }
  }

  const actionWordMatch = normalized.match(
    new RegExp(
      `(?:gib(?:\\s+mir)?|give(?:\\s+me)?|empf(?:iehl)?|recommend|suggest|schlag(?:\\s+mir)?(?:\\s+vor)?)\\D{0,24}(${wordAlternation})(?:\\s|$)`,
      "i"
    )
  );

  if (actionWordMatch?.[1]) {
    const matchedWord = actionWordMatch[1].toLowerCase();
    const count = wordToNumber[matchedWord];
    if (typeof count === "number") {
      return count;
    }
  }

  return null;
}

function getRequestedPickCount(input: {
  prompt?: string;
  conversation?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  let requestedRaw = 5;
  const fromPrompt = input.prompt ? parseRequestedCount(input.prompt) : null;

  if (fromPrompt !== null) {
    requestedRaw = fromPrompt;
    return {
      requestedRaw,
      requestedPickCount: clamp(fromPrompt, 1, MAX_ASSISTANT_SUGGESTIONS),
      cappedBySystem: fromPrompt > MAX_ASSISTANT_SUGGESTIONS,
      explicitlyRequested: true
    };
  }

  const recentConversation = (input.conversation ?? [])
    .filter(message => message.role === "user")
    .slice(-3)
    .map(message => message.content);
  for (const content of recentConversation.reverse()) {
    const parsed = parseRequestedCount(content);
    if (parsed !== null) {
      requestedRaw = parsed;
      return {
        requestedRaw,
        requestedPickCount: clamp(parsed, 1, MAX_ASSISTANT_SUGGESTIONS),
        cappedBySystem: parsed > MAX_ASSISTANT_SUGGESTIONS,
        explicitlyRequested: true
      };
    }
  }

  return {
    requestedRaw,
    requestedPickCount: 5,
    cappedBySystem: false,
    explicitlyRequested: false
  };
}

function isSuggestionCapacityQuestion(input: {
  prompt?: string;
  conversation?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const combined = [
    input.prompt ?? "",
    ...(input.conversation ?? [])
      .filter(message => message.role === "user")
      .map(message => message.content)
  ]
    .join(" \n ")
    .toLowerCase();

  return (
    /wie viele[^.!?\n]{0,40}(?:filme|serien|titel|vorschl[aä]ge)/.test(combined) ||
    /how many[^.!?\n]{0,40}(?:movies|series|titles|suggestions|picks)/.test(combined)
  );
}

function collectUserConversationText(
  conversation: Array<{ role: "user" | "assistant"; content: string }>,
  options?: { limit?: number }
) {
  const userMessages = conversation.filter(message => message.role === "user");
  const limited =
    options?.limit && options.limit > 0
      ? userMessages.slice(-options.limit)
      : userMessages;

  return limited.map(message => message.content).join(" \n ");
}

function isTitleInfoRequest(input: {
  prompt: string;
  conversation: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  if (extractLikelyTitleQuery(input.prompt)) {
    return true;
  }

  const combined = `${input.prompt}\n${collectUserConversationText(input.conversation, { limit: 1 })}`.toLowerCase();
  return (
    /\b(mehr über|infos?\s+zu|erzähl mir mehr über)\b/.test(combined) ||
    /\b(tell me more about|more about|info about)\b/.test(combined)
  );
}

function extractStandaloneTitleCandidate(prompt: string) {
  const cleaned = prompt
    .trim()
    .replace(/^[\s"'`„“]+|[\s"'`“”.!?]+$/g, "")
    .trim();

  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) {
    return null;
  }

  if (!/[a-zA-Z]/.test(cleaned)) {
    return null;
  }

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  if (wordCount > 7) {
    return null;
  }

  const lowered = cleaned.toLowerCase();
  if (
    /^(wie|what|tell|kannst|can|gib|give|schlag|recommend|suggest|nenn|nenne|erzaehl|erzähl)\b/.test(
      lowered
    )
  ) {
    return null;
  }

  if (/\b(minuten?|minutes?|folgen?|episodes?|staffeln?|seasons?|genre|mood|stimmung)\b/.test(lowered)) {
    return null;
  }

  return cleaned;
}

function assistantRequestedExactTitle(
  conversation: Array<{ role: "user" | "assistant"; content: string }>
) {
  const lastAssistantMessage = conversation
    .filter(message => message.role === "assistant")
    .slice(-1)
    .map(message => message.content.toLowerCase())[0];

  if (!lastAssistantMessage) {
    return false;
  }

  return (
    lastAssistantMessage.includes("genauen titel") ||
    lastAssistantMessage.includes("exact title") ||
    lastAssistantMessage.includes("worum geht es in") ||
    (lastAssistantMessage.includes("what is") && lastAssistantMessage.includes("about"))
  );
}

function isTitleDetailFollowUpPrompt(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\b(wie lange|laufzeit|folgenl[aä]nge|episode length|runtime|how long|minutes?)\b/.test(
      normalized
    ) ||
    /\b(staffeln?|seasons?|episoden?|episodes?)\b/.test(normalized) ||
    /\b(genre|genres?|kategorie|kategorien)\b/.test(normalized) ||
    /\b(besetzung|cast|schauspieler|actors?)\b/.test(normalized) ||
    /\b(sprachen?|languages?)\b/.test(normalized) ||
    /\b(network|sender|plattform|platform)\b/.test(normalized) ||
    /\b(ausführlicher|ausfuehrlicher|mehr details|mehr dazu|more details|tell me more)\b/.test(normalized)
  );
}

function isTitleInfoFollowUpIntent(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\b(was passiert|worum geht|mehr über|mehr dazu|infos?\s+zu|erzähl mir mehr)\b/.test(normalized) ||
    /\b(what happens|what is .* about|tell me more|more about|info about)\b/.test(normalized)
  );
}

function isDirectLinkRequest(prompt: string) {
  const normalized = prompt.toLowerCase();

  const asksForLink =
    /\b(link|url|href|detailseite|seite|page|direct link|direkter link)\b/.test(normalized) ||
    /\b(gib mir den link|schick mir den link|send me the link|give me the link|gib mir die seite|zeig mir die seite|show me the page)\b/.test(
      normalized
    );
  const hasDeicticReference = /\b(dazu|davon|zu dem|zu der|zu diesem|to that|for that|for it)\b/.test(
    normalized
  );

  return asksForLink || (hasDeicticReference && /\b(link|url|seite|page)\b/.test(normalized));
}

function extractCharacterQuestion(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const patterns = [
    /(?:welche\s+rolle\s+hat|wer\s+ist|was\s+ist)\s+["„“]?(.+?)["“”]?\s+(?:in|bei)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:what\s+role\s+does|who\s+is|what\s+is)\s+["“”]?(.+?)["“”]?\s+(?:in|on)\s+["“”]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:welche\s+rolle\s+hat|wer\s+ist|was\s+ist)\s+["„“]?(.+?)["“”]?\s+(?:darin|dort)\s*[.!?]?$/i,
    /(?:what\s+role\s+does|who\s+is|what\s+is)\s+["“”]?(.+?)["“”]?\s+(?:there|in it)\s*[.!?]?$/i,
    /(?:kennst\s+du|do\s+you\s+know)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i
  ] as const;

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const character = match?.[1]?.trim();
    const title = match?.[2]?.trim() ?? null;

    if (character && character.length >= 2) {
      return {
        character: character.replace(/^[\s"'`„“]+|[\s"'`“”]+$/g, "").trim(),
        title: title?.replace(/^[\s"'`„“]+|[\s"'`“”]+$/g, "").trim() ?? null
      };
    }
  }

  return null;
}

function isNameContainsSearchIntent(prompt: string) {
  const normalized = prompt.toLowerCase();
  return (
    /\b(im\s+namen|im\s+titel)\b/.test(normalized) ||
    /\b(in\s+the\s+name|in\s+the\s+title)\b/.test(normalized) ||
    /\bmit\s+.+\s+im\s+namen\b/.test(normalized) ||
    /\bwith\s+.+\s+in\s+the\s+(?:name|title)\b/.test(normalized)
  );
}

function extractNameContainsQuery(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const patterns = [
    /(?:mit|with)\s+["„“]?(.+?)["“”]?\s+(?:im\s+namen|im\s+titel|in\s+the\s+(?:name|title))/i,
    /(?:haben|have)\s+["„“]?(.+?)["“”]?\s+(?:im\s+namen|im\s+titel|in\s+the\s+(?:name|title))/i,
    /["„“]?(.+?)["“”]?\s+(?:im\s+namen|im\s+titel|in\s+the\s+(?:name|title))/i
  ] as const;

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = match?.[1]?.trim();
    if (!candidate) {
      continue;
    }

    const cleaned = candidate
      .replace(/^(?:der|die|das|dem|den|the)\s+/i, "")
      .replace(/\b(?:serie|serien|film|filme|titles?|titel|anime)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned.length >= 2) {
      return cleaned;
    }
  }

  return null;
}

function extractDirectLinkTargetTitle(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return null;
  }

  const patterns = [
    /(?:gib|schick|zeige|zeig)\s+mir\s+(?:den|die)?\s*(?:link|url|seite|detailseite)\s+(?:zu|für|fuer)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:send|give|show)\s+me\s+(?:the\s+)?(?:link|url|page)\s+(?:to|for)\s+["“”]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:link|url|seite|page)\s+(?:zu|für|fuer|to|for)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i
  ] as const;

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = match?.[1]?.trim();

    if (candidate && candidate.length >= 2) {
      return candidate.replace(/^[\s"'`„“]+|[\s"'`“”]+$/g, "").trim();
    }
  }

  return null;
}

function extractAssistantLeadTitle(content: string) {
  const normalized = content.trim();

  if (!normalized) {
    return null;
  }

  const quotedMatch = normalized.match(/["'„“]([^"'„“”]{2,90})["'“”]/);
  const quotedCandidate = quotedMatch?.[1]?.trim();
  if (quotedCandidate && /[a-zA-Z]/.test(quotedCandidate)) {
    return quotedCandidate;
  }

  const patterns = [
    /infos?\s+zu\s+["'„“]?(.+?)["'“”]?(?:[.!?]|$)/i,
    /information(?:en)?\s+zu\s+["'„“]?(.+?)["'“”]?(?:[.!?]|$)/i,
    /about\s+["'“”]?(.+?)["'“”]?(?:[.!?]|$)/i,
    /^(.+?)\s+ist\s+ein(?:e)?\s+/i,
    /^(.+?)\s+is\s+(?:a|an)\s+/i
  ] as const;

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = match?.[1]?.trim();

    if (candidate && candidate.length <= 90 && /[a-zA-Z]/.test(candidate)) {
      return candidate.replace(/^[\s"'`„“]+|[\s"'`“”]+$/g, "").trim();
    }
  }

  return null;
}

function isPersonInfoIntent(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\b(schauspieler|schauspielerin|schaupieler|darsteller|person|regisseur|director|actor|actress|cast member)\b/.test(
      normalized
    ) ||
    /\b(wo\s+spielt?|wo\s+spiel(?:t)?\s+.+\s+mit|where\s+does\s+.+\s+(play|star)|mitspielt?)\b/.test(
      normalized
    ) ||
    /\b(über\s+den\s+schauspieler|ueber den schauspieler|about the actor|about dwayne johnson)\b/.test(
      normalized
    )
  );
}

function isPersonFilmographyRequest(prompt: string) {
  const normalized = prompt.toLowerCase();

  return (
    /\b(wo\s+spielt?|mitspielt?|filmografie|filmography|starring|stars?\s+in)\b/.test(normalized) ||
    (/\b(film|filme|movie|movies|serie|serien|show|shows)\b/.test(normalized) &&
      /\b(mit|with|von|from)\b/.test(normalized))
  );
}

function normalizePersonQueryAlias(query: string) {
  const normalized = normalizeTitleForLookup(query);

  if (normalized === "the rock" || normalized === "rock") {
    return "Dwayne Johnson";
  }

  return query;
}

function inferPersonRequestMediaType(
  prompt: string,
  preferred: "all" | "movie" | "tv"
) {
  if (preferred !== "all") {
    return preferred;
  }

  const normalized = prompt.toLowerCase();
  if (/\b(film|filme|movie|movies)\b/.test(normalized)) {
    return "movie" as const;
  }

  if (/\b(serie|serien|show|shows|tv)\b/.test(normalized)) {
    return "tv" as const;
  }

  return "all" as const;
}

function extractLikelyPersonQuery(prompt: string) {
  const normalized = prompt.trim();

  if (!normalized) {
    return null;
  }

  const patterns = [
    /(?:über|ueber)\s+den\s+schauspieler\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:über|ueber)\s+die\s+schauspielerin\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:mehr\s+über|infos?\s+zu)\s+dem\s+schauspieler\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /\bwo\s+spiel(?:t)?\s+["„“]?(.+?)["“”]?\s+mit\b/i,
    /(?:filme?|serien?|movies?|shows?)\s+mit\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:tell\s+me\s+about|more\s+about)\s+(?:the\s+actor|actor)\s+["“”]?(.+?)["“”]?\s*[.!?]?$/i,
    /\bwhere\s+does\s+["“”]?(.+?)["“”]?\s+(?:play|star)\b/i,
    /(?:movies?|shows?)\s+with\s+["“”]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:actor|actress|director)\s+["“”]?(.+?)["“”]?\s*[.!?]?$/i
  ] as const;

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate) {
      return candidate.replace(/^[\s"'`„“]+|[\s"'`“”]+$/g, "").trim();
    }
  }

  return null;
}

function isRecommendationRequest(input: {
  prompt: string;
  conversation: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const combined = `${input.prompt}\n${collectUserConversationText(input.conversation, { limit: 6 })}`.toLowerCase();
  return (
    /\b(empfiehl|empfehl|vorschlag|schlag.*vor|suche|zeig mir|gib mir|was schauen|was gucken)\b/.test(
      combined
    ) ||
    /\b(recommend|suggest|show me|give me|what should i watch|looking for)\b/.test(combined) ||
    /\b(film|filme|serie|serien|movie|movies|show|shows|anime|animes)\b/.test(combined)
  );
}

function isExplicitRecommendationIntent(prompt: string) {
  const normalized = prompt.toLowerCase();
  return (
    /\b(empfiehl|empfehl|vorschlag|schlag.*vor|suche|zeig mir|gib mir|was schauen|was gucken)\b/.test(
      normalized
    ) ||
    /\b(recommend|suggest|show me|give me|what should i watch|looking for)\b/.test(normalized)
  );
}

function hasPreferenceSignals(input: {
  prompt: string;
  conversation: Array<{ role: "user" | "assistant"; content: string }>;
  timeBudget?: string;
  mood?: string;
  intensity?: string;
  socialContext?: string;
  referencesCount: number;
}) {
  if (
    input.timeBudget?.trim() ||
    input.mood?.trim() ||
    input.intensity ||
    input.socialContext ||
    input.referencesCount > 0
  ) {
    return true;
  }

  const combined = `${input.prompt}\n${collectUserConversationText(input.conversation, { limit: 6 })}`.toLowerCase();

  return (
    /\b(action|drama|thriller|horror|comedy|komödie|komoedie|romance|romantik|crime|krimi|mystery|sci[\s-]?fi|science fiction|fantasy|animation|anime|family|dokumentation|documentary|abenteuer)\b/.test(
      combined
    ) ||
    /\b(düster|duester|dark|leicht|light|intens|intense|entspannt|relaxed|gritty|feel good|feelgood)\b/.test(
      combined
    ) ||
    /\b(heute abend|tonight|wochenende|weekend|90 minuten|2 stunden|2 hours|kurz|miniserie)\b/.test(
      combined
    ) ||
    /\b(mit freunden|mit eltern|date night|family|alleine|solo)\b/.test(combined)
  );
}

function extractRecentConversationTitleCandidate(
  conversation: Array<{ role: "user" | "assistant"; content: string }>
) {
  const recentUserMessages = conversation
    .filter(message => message.role === "user")
    .slice(-4)
    .reverse();

  for (const message of recentUserMessages) {
    const direct = extractLikelyTitleQuery(message.content);
    if (direct) {
      return direct;
    }

    const standalone = extractStandaloneTitleCandidate(message.content);
    if (standalone) {
      return standalone;
    }
  }

  return null;
}

function extractRecentAssistantTitleCandidate(
  conversation: Array<{ role: "user" | "assistant"; content: string }>
) {
  const recentAssistantMessages = conversation
    .filter(message => message.role === "assistant")
    .slice(-4)
    .reverse();

  for (const message of recentAssistantMessages) {
    const candidate = extractAssistantLeadTitle(message.content);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function parseRuntimeMinutes(rawMinutes: string) {
  const minutes = Number(rawMinutes);
  if (!Number.isFinite(minutes)) {
    return null;
  }

  if (minutes < 10 || minutes > 180) {
    return null;
  }

  return minutes;
}

function getRequestedEpisodeRuntime(input: {
  prompt?: string;
  conversation?: Array<{ role: "user" | "assistant"; content: string }>;
  mediaType: "all" | "movie" | "tv";
}) {
  const combined = [
    input.prompt ?? "",
    ...(input.conversation ?? [])
      .filter(message => message.role === "user")
      .map(message => message.content)
  ]
    .join(" \n ")
    .toLowerCase();

  const episodeIntent =
    input.mediaType === "tv" ||
    /\b(folge|folgen|episod(?:e|en)|episode(?:s)?|serie|serien|series|pro folge|per episode)\b/.test(
      combined
    );

  if (!episodeIntent) {
    return null;
  }

  const maxMatch = combined.match(
    /\b(?:unter|max(?:imal)?|höchstens|hoechstens|bis zu|at most|up to|under)\s*(\d{1,3})\s*(?:min(?:uten)?|minutes?)\b/
  );
  if (maxMatch?.[1]) {
    const minutes = parseRuntimeMinutes(maxMatch[1]);
    if (minutes !== null) {
      return { mode: "max", minutes, tolerance: 0 } satisfies EpisodeRuntimePreference;
    }
  }

  const minMatch = combined.match(
    /\b(?:mindestens|min(?:imal)?|at least|minimum)\s*(\d{1,3})\s*(?:min(?:uten)?|minutes?)\b/
  );
  if (minMatch?.[1]) {
    const minutes = parseRuntimeMinutes(minMatch[1]);
    if (minutes !== null) {
      return { mode: "min", minutes, tolerance: 0 } satisfies EpisodeRuntimePreference;
    }
  }

  const aroundMatch = combined.match(
    /\b(?:ca\.?|circa|ungef[aä]hr|around|about|roughly|knapp)?\s*(\d{1,3})\s*(?:min(?:uten)?|minutes?)\b/
  );
  if (aroundMatch?.[1]) {
    const minutes = parseRuntimeMinutes(aroundMatch[1]);
    if (minutes !== null) {
      return {
        mode: "around",
        minutes,
        tolerance: minutes <= 35 ? 6 : 10
      } satisfies EpisodeRuntimePreference;
    }
  }

  return null;
}

function matchesEpisodeRuntime(runtime: number, preference: EpisodeRuntimePreference) {
  if (preference.mode === "max") {
    return runtime <= preference.minutes;
  }

  if (preference.mode === "min") {
    return runtime >= preference.minutes;
  }

  return Math.abs(runtime - preference.minutes) <= preference.tolerance;
}

function formatEpisodeRuntimePreference(preference: EpisodeRuntimePreference, locale: Locale) {
  if (preference.mode === "max") {
    return locale === "en"
      ? `Episodes up to ${preference.minutes} minutes`
      : `Folgen bis ${preference.minutes} Minuten`;
  }

  if (preference.mode === "min") {
    return locale === "en"
      ? `Episodes at least ${preference.minutes} minutes`
      : `Folgen mindestens ${preference.minutes} Minuten`;
  }

  return locale === "en"
    ? `Episodes around ${preference.minutes} minutes`
    : `Folgen etwa ${preference.minutes} Minuten`;
}

async function filterAssistantPicksByEpisodeRuntime<
  T extends {
    title: string;
    mediaType: "movie" | "tv";
    reason: string;
    comparableTitle?: string;
    tmdbId?: number;
    href?: string;
  }
>(
  picks: T[],
  preference: EpisodeRuntimePreference,
  locale: Locale
) {
  const tvCandidates = picks.filter(
    (pick): pick is (typeof picks)[number] & { tmdbId: number; mediaType: "tv" } =>
      pick.mediaType === "tv" && typeof pick.tmdbId === "number"
  );

  if (!tvCandidates.length) {
    return [] as T[];
  }

  const contexts = await getManyMediaAIContexts(
    tvCandidates.map(candidate => ({
      tmdbId: candidate.tmdbId,
      mediaType: candidate.mediaType
    })),
    locale
  );

  const allowedIds = new Set(
    contexts
      .filter(context => {
        const runtime = context.runtime;
        if (!runtime || runtime <= 0) {
          return false;
        }

        return matchesEpisodeRuntime(runtime, preference);
      })
      .map(context => context.tmdbId)
  );

  return tvCandidates.filter(candidate => allowedIds.has(candidate.tmdbId)) as T[];
}

function getRequestedSeasonCount(input: {
  prompt?: string;
  conversation?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const combined = [
    input.prompt ?? "",
    ...(input.conversation ?? [])
      .filter(message => message.role === "user")
      .map(message => message.content)
  ]
    .join(" \n ")
    .toLowerCase();

  if (
    /(?:nur|only)[^.!?\n]{0,30}(?:eine|1|one)\s+(?:staffel|season)\b/.test(combined) ||
    /(?:mit|with)[^.!?\n]{0,20}(?:nur|only)?[^.!?\n]{0,10}(?:eine|1|one)\s+(?:staffel|season)\b/.test(combined)
  ) {
    return 1;
  }

  return null;
}

function extractLikelyTitleQuery(input: string) {
  const normalized = input.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return null;
  }

  const patterns = [
    /(?:ich\s+meinte|gemeint\s+ist|nein,\s*ich\s+meinte|no,\s*i\s+meant|i\s+meant)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:mehr\s+über|infos?\s+zu|info\s+zu|was\s+wei[sß]t\s+du\s+über)\s+["„“]?(.+?)["“”]?(?:\s+(?:wissen|erfahren))?\s*[.!?]?$/i,
    /(?:worum\s+geht\s+es\s+in|worum\s+geht'?s\s+in)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:was\s+passiert\s+in)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:was\s+passiert\s+bei)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:erz[aä]hl(?:e)?\s+mir\s+(?:mehr\s+)?(?:über|zu))\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:wie\s+lange[^.!?\n]{0,60}(?:bei|von|in)\s*)["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:wie\s+lang[^.!?\n]{0,60}(?:bei|von|in)\s*)["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:wie\s+lange\s+dauert[^.!?\n]{0,80}(?:bei|von|in)\s*)["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:tell\s+me\s+more\s+about|more\s+about|info\s+about|what\s+about)\s+["“”]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:what\s+happens\s+in)\s+["“”]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:what\s+is|what'?s)\s+["“”]?(.+?)["“”]?\s+about\s*[.!?]?$/i,
    /(?:how\s+long[^.!?\n]{0,60}(?:for|in)\s*)["“”]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:ähnlich\s+zu|wie)\s+["„“]?(.+?)["“”]?\s*(?:sind|ist)?\s*[.!?]?$/i,
    /(?:similar\s+to|like)\s+["“”]?(.+?)["“”]?\s*[.!?]?$/i
  ] as const;

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const candidate = match?.[1]?.trim();

    if (candidate) {
      return candidate.replace(/^[\s"'`„“]+|[\s"'`“”]+$/g, "").trim();
    }
  }

  return null;
}

async function ensureResolvedMediaAllowed(
  input: {
    query: string;
    mediaType?: "all" | "movie" | "tv";
    hints?: ResolveMediaHints;
  },
  locale: Locale
) {
  const text = getText(locale);
  const resolved = await resolveMediaAIContext({ ...input, locale });

  if (!resolved) {
    return {
      resolved: null,
      error: text.unresolved,
      status: 404
    };
  }

  const access = await getAgeAccessForMedia(resolved.context.mediaType, resolved.context.tmdbId);

  if (!access.allowed) {
    return {
      resolved: null,
      error: text.blocked,
      status: 403
    };
  }

  return {
    resolved,
    error: null,
    status: 200
  };
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const locale = getLocaleFromCookieHeader(request.headers.get("cookie"));
  const text = getText(locale);
  const ip = getRequestIp(request);
  const rateLimit = checkRateLimit(
    getRateLimitIdentityKey("api-ai-assistant", ip),
    40,
    60_000
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: text.rateLimited },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const rawBody = await request.json().catch(() => null);
  const body =
    rawBody && typeof rawBody === "object"
      ? (() => {
          const sanitizedBody = { ...(rawBody as Record<string, unknown>) };

          if (
            sanitizedBody.mode === "assistant" &&
            Array.isArray(sanitizedBody.conversation)
          ) {
            sanitizedBody.conversation = sanitizedBody.conversation
              .slice(-MAX_ASSISTANT_CONTEXT_MESSAGES)
              .map(entry => {
                if (!entry || typeof entry !== "object") {
                  return entry;
                }

                const typed = entry as { role?: unknown; content?: unknown };
                return {
                  role: typed.role,
                  content:
                    typeof typed.content === "string"
                      ? typed.content.slice(0, 500)
                      : typed.content
                };
              });
          }

          if (
            sanitizedBody.mode === "assistant" &&
            typeof sanitizedBody.prompt === "string"
          ) {
            sanitizedBody.prompt = sanitizedBody.prompt.slice(0, 400);
          }

          return sanitizedBody;
        })()
      : rawBody;
  const parsed = aiActionSchema.safeParse(body);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return NextResponse.json(
      {
        error: formatValidationError(
          flattened.fieldErrors,
          flattened.formErrors,
          text.invalidInput,
          text.invalidPrompt,
          text.invalidConversation
        )
      },
      { status: 400 }
    );
  }

  const hasUnsafePrompt = (() => {
    switch (parsed.data.mode) {
      case "assistant":
        return false;
      case "compare":
        return containsPromptInjection([parsed.data.left.query, parsed.data.right.query]);
      case "fit":
        return containsPromptInjection([
          parsed.data.title.query,
          parsed.data.userPrompt,
          ...parsed.data.feedback.map(item => item.title)
        ]);
      case "priority":
      case "priority_groups":
        return containsPromptInjection([
          parsed.data.context,
          ...parsed.data.feedback.map(item => item.title)
        ]);
      case "title_insights":
        return containsPromptInjection([parsed.data.title.query]);
      case "person_insights":
        return false;
    }
  })();

  if (hasUnsafePrompt) {
    return NextResponse.json({ error: text.unsafePrompt }, { status: 400 });
  }

  try {
    switch (parsed.data.mode) {
      case "compare": {
        const [leftResult, rightResult] = await Promise.all([
          ensureResolvedMediaAllowed(parsed.data.left, locale),
          ensureResolvedMediaAllowed(parsed.data.right, locale)
        ]);

        if (!leftResult.resolved || !rightResult.resolved) {
          return NextResponse.json(
            {
              error:
                leftResult.error ??
                rightResult.error ??
                text.unresolvedOne
            },
            { status: leftResult.status !== 200 ? leftResult.status : rightResult.status }
          );
        }

        const left = leftResult.resolved;
        const right = rightResult.resolved;

        const data = await askOpenRouterJson(
          comparePrompt(left.context, right.context, locale),
          aiCompareResponseSchema
        );

        return NextResponse.json({
          mode: "compare",
          data,
          resolved: {
            left: { title: left.context.title, href: left.href },
            right: { title: right.context.title, href: right.href }
          }
        });
      }

      case "fit": {
        const result = await ensureResolvedMediaAllowed(parsed.data.title, locale);

        if (!result.resolved) {
          return NextResponse.json(
            { error: result.error ?? text.unresolved },
            { status: result.status }
          );
        }

        const resolved = result.resolved;

        const data = await askOpenRouterJson(
          fitPrompt(
            {
              title: resolved.context,
              feedback: parsed.data.feedback,
              userPrompt: parsed.data.userPrompt
            },
            locale
          ),
          aiFitResponseSchema
        );

        return NextResponse.json({
          mode: "fit",
          data,
          resolved: {
            title: resolved.context.title,
            href: resolved.href
          }
        });
      }

      case "priority": {
        const titles = await getManyMediaAIContexts(parsed.data.items, locale);
        const data = await askOpenRouterJson(
          priorityPrompt(
            {
              titles,
              feedback: parsed.data.feedback,
              context: parsed.data.context
            },
            locale
          ),
          aiPriorityResponseSchema
        );
        const order = await resolveAIPicks(data.order, locale);

        return NextResponse.json({
          mode: "priority",
          data: {
            ...data,
            order
          }
        });
      }

      case "priority_groups": {
        const titles = await getManyMediaAIContexts(parsed.data.items, locale);
        try {
          const data = await askOpenRouterJson(
            priorityGroupsPrompt(
              {
                titles,
                feedback: parsed.data.feedback,
                context: parsed.data.context
              },
              locale
            ),
            aiPriorityGroupsResponseSchema
          );

          const groups = await Promise.all(
            data.groups.map(async group => ({
              ...group,
              items: await resolveAIPicks(group.items, locale)
            }))
          );
          const dedupedGroups = dedupeAndNormalizePriorityGroups(groups, titles, locale);

          return NextResponse.json({
            mode: "priority_groups",
            data: {
              ...data,
              groups: dedupedGroups
            }
          });
        } catch (error) {
          console.warn("[api/ai/assistant] priority_groups fallback:", error);

          const fallback = buildFallbackPriorityGroups(titles, locale);
          return NextResponse.json({
            mode: "priority_groups",
            data: fallback
          });
        }
      }

      case "assistant": {
        const assistantSafety = await runAssistantSafetyGate({
          prompt: parsed.data.prompt,
          conversation: parsed.data.conversation,
          additionalText: [
            parsed.data.timeBudget,
            parsed.data.mood,
            ...parsed.data.referenceTitles.map(reference => reference.query)
          ]
        });

        if (assistantSafety.blocked) {
          return NextResponse.json({
            mode: "assistant",
            data: {
              lead: text.unsafePromptLead,
              picks: [],
              nextStep: text.unsafePromptNext
            }
          });
        }

        const safePrompt = assistantSafety.sanitizedPrompt;
        const safeConversation = assistantSafety.sanitizedConversation;
        const titleResolutionHints = inferTitleResolutionHints(safePrompt, safeConversation);
        const requestedWatchRegion = getPreferredWatchRegionFromCookieHeader(
          request.headers.get("cookie")
        );
        const explicitRecommendationIntent = isExplicitRecommendationIntent(safePrompt);
        const { requestedPickCount, requestedRaw, cappedBySystem, explicitlyRequested } = getRequestedPickCount({
          prompt: safePrompt,
          conversation: safeConversation
        });
        const noveltyRequested = isNoveltyRequest({
          prompt: safePrompt,
          conversation: safeConversation
        });
        const episodeRuntimePreference = getRequestedEpisodeRuntime({
          prompt: safePrompt,
          conversation: safeConversation,
          mediaType: parsed.data.mediaType
        });
        const requestedSeasonCount = getRequestedSeasonCount({
          prompt: safePrompt,
          conversation: safeConversation
        });
        const recentListQualifier = extractRecentListQualifier(safePrompt);
        const safeTimeBudget = parsed.data.timeBudget
          ? sanitizeAssistantInputText(parsed.data.timeBudget)
          : undefined;
        const safeMood = parsed.data.mood ? sanitizeAssistantInputText(parsed.data.mood) : undefined;
        const safeReferenceTitles = parsed.data.referenceTitles
          .map(reference => ({
            ...reference,
            query: sanitizeAssistantInputText(reference.query)
          }))
          .filter(reference => reference.query.length > 0);
        const explicitReferenceResults = await Promise.all(
          safeReferenceTitles.map(reference =>
            ensureResolvedMediaAllowed(
              {
                ...reference,
                hints: titleResolutionHints
              },
              locale
            )
          )
        );
        const references = explicitReferenceResults
          .filter(result => result.resolved)
          .map(result => result.resolved!.context);

        if (references.length < 4) {
          const recentSuggestedTitles = extractMostRecentSuggestedTitles(safeConversation);
          const implicitSuggestedTitle = findSuggestedTitleMentionInPrompt(
            safePrompt,
            recentSuggestedTitles
          );
          const inferredCandidates = [
            implicitSuggestedTitle,
            extractRecentConversationTitleCandidate(safeConversation),
            extractStandaloneTitleCandidate(safePrompt),
            extractLikelyTitleQuery(safePrompt),
            recentSuggestedTitles[0] ?? null,
            ...recentSuggestedTitles.slice(0, 8),
            ...safeConversation
              .filter(message => message.role === "user")
              .slice(-8)
              .map(message => extractLikelyTitleQuery(message.content)),
            ...safeConversation
              .filter(message => message.role === "user")
              .slice(-6)
              .map(message => extractStandaloneTitleCandidate(message.content))
          ].filter((value): value is string => !!value);

          for (const query of inferredCandidates) {
            if (references.length >= 4) {
              break;
            }

            const alreadyReferenced = references.some(
              reference => reference.title.toLowerCase() === query.toLowerCase()
            );

            if (alreadyReferenced) {
              continue;
            }

            const resolved = await ensureResolvedMediaAllowed(
              {
                query,
                mediaType: "all",
                hints: titleResolutionHints
              },
              locale
            );

            if (resolved.resolved) {
              references.push(resolved.resolved.context);
            }
          }
        }

        const nameContainsIntent = isNameContainsSearchIntent(safePrompt);
        if (nameContainsIntent) {
          const nameContainsQuery =
            extractNameContainsQuery(safePrompt) ??
            extractLikelyTitleQuery(safePrompt) ??
            extractStandaloneTitleCandidate(safePrompt);

          if (nameContainsQuery) {
            const searchResult = await searchMedia({
              query: nameContainsQuery,
              mediaType: parsed.data.mediaType,
              locale,
              page: 1
            });

            const normalizedQuery = normalizeTitleForLookup(nameContainsQuery);
            const queryTokens = normalizedQuery.split(" ").filter(Boolean);
            const strictMatches = searchResult.items.filter(item => {
              const normalizedTitle = normalizeTitleForLookup(item.title);
              const normalizedOriginalTitle = normalizeTitleForLookup(item.originalTitle);

              const phraseMatch =
                !!normalizedQuery &&
                (normalizedTitle.includes(normalizedQuery) ||
                  normalizedOriginalTitle.includes(normalizedQuery));
              const tokenMatch =
                queryTokens.length >= 2 &&
                queryTokens.every(
                  token =>
                    normalizedTitle.includes(token) ||
                    normalizedOriginalTitle.includes(token)
                );

              return phraseMatch || tokenMatch;
            });

            const dedupedStrictMatches = Array.from(
              new Map(
                strictMatches.map(item => [`${item.mediaType}-${item.tmdbId}`, item])
              ).values()
            ).sort((left, right) => (right.voteCount ?? 0) - (left.voteCount ?? 0));

            const maxNameMatchPicks = explicitlyRequested
              ? requestedPickCount
              : MAX_ASSISTANT_SUGGESTIONS;
            const candidateItems = dedupedStrictMatches.slice(
              0,
              Math.max(maxNameMatchPicks * 3, 24)
            );
            const nameContainsPicks: Array<{
              title: string;
              mediaType: "movie" | "tv";
              reason: string;
              tmdbId: number;
              href: string;
            }> = [];

            for (const item of candidateItems) {
              if (nameContainsPicks.length >= maxNameMatchPicks) {
                break;
              }

              const access = await getAgeAccessForMedia(item.mediaType, item.tmdbId);
              if (!access.allowed) {
                continue;
              }

              nameContainsPicks.push({
                title: item.title,
                mediaType: item.mediaType,
                reason:
                  locale === "en"
                    ? `Title contains "${nameContainsQuery}".`
                    : `Titel enthält "${nameContainsQuery}".`,
                tmdbId: item.tmdbId,
                href: `/${item.mediaType}/${item.tmdbId}`
              });
            }

            if (nameContainsPicks.length) {
              const total = dedupedStrictMatches.length;
              return NextResponse.json({
                mode: "assistant",
                data: {
                  intent: "recommend",
                  lead:
                    locale === "en"
                      ? `I found ${total} title${total === 1 ? "" : "s"} with "${nameContainsQuery}" in the title. Here are ${nameContainsPicks.length}.`
                      : `Ich habe ${total} Titel mit "${nameContainsQuery}" im Namen gefunden. Hier sind ${nameContainsPicks.length}.`,
                  personalNote:
                    locale === "en"
                      ? "These picks are strictly based on TMDB title-name matches."
                      : "Diese Vorschläge basieren strikt auf Titel-Treffern aus TMDB.",
                  picks: nameContainsPicks,
                  nextStep:
                    locale === "en"
                      ? total > nameContainsPicks.length
                        ? "If you want, I can continue with the next batch or narrow it to movies or series only."
                        : "If you want, I can narrow it down to only movies or only series."
                      : total > nameContainsPicks.length
                        ? "Wenn du möchtest, liefere ich dir die nächste Runde oder grenze auf nur Filme oder nur Serien ein."
                        : "Wenn du möchtest, grenze ich das auf nur Filme oder nur Serien ein."
                }
              });
            }

            return NextResponse.json({
              mode: "assistant",
              data: {
                intent: "clarify",
                lead:
                  locale === "en"
                    ? `I could not find suitable title matches for "${nameContainsQuery}".`
                    : `Ich konnte keine passenden Titel mit "${nameContainsQuery}" im Namen finden.`,
                picks: [],
                nextStep:
                  locale === "en"
                    ? "Try a slightly shorter or alternative title phrase."
                    : "Versuche eine etwas kürzere oder alternative Titelphrase."
              }
            });
          }
        }

        if (isLatestReleaseIntent(safePrompt)) {
          const discoverMediaType = inferDiscoverMediaType(safePrompt, parsed.data.mediaType);
          const today = new Date().toISOString().slice(0, 10);
          const targetCount = Math.min(requestedPickCount, MAX_ASSISTANT_SUGGESTIONS);

          const loadLatestForType = async (mediaType: "movie" | "tv") => {
            const sort =
              mediaType === "movie" ? "primary_release_date.desc" : "first_air_date.desc";
            const collected: Array<(Awaited<ReturnType<typeof getDiscoverResults>>)["items"][number]> = [];
            const seen = new Set<string>();

            for (let page = 1; page <= 5; page += 1) {
              const result = await getDiscoverResults({
                mediaType,
                page,
                sort,
                locale
              });

              for (const item of result.items) {
                if (!item.releaseDate || item.releaseDate > today) {
                  continue;
                }

                const key = `${item.mediaType}:${item.tmdbId}`;
                if (seen.has(key)) {
                  continue;
                }

                const access = await getAgeAccessForMedia(item.mediaType, item.tmdbId);
                if (!access.allowed) {
                  continue;
                }

                seen.add(key);
                collected.push(item);

                if (collected.length >= Math.max(targetCount * 2, 12)) {
                  return collected;
                }
              }

              if (result.totalPages <= page) {
                break;
              }
            }

            return collected;
          };

          const latestItems =
            discoverMediaType === "movie"
              ? await loadLatestForType("movie")
              : discoverMediaType === "tv"
                ? await loadLatestForType("tv")
                : (
                    await Promise.all([loadLatestForType("movie"), loadLatestForType("tv")])
                  )
                    .flat()
                    .sort((left, right) =>
                      (right.releaseDate ?? "").localeCompare(left.releaseDate ?? "")
                    );

          const dedupedLatestItems = latestItems
            .filter(
              (item, index, all) =>
                all.findIndex(
                  candidate =>
                    candidate.mediaType === item.mediaType && candidate.tmdbId === item.tmdbId
                ) === index
            )
            .slice(0, targetCount);

          if (dedupedLatestItems.length) {
            return NextResponse.json({
              mode: "assistant",
              data: {
                intent: "recommend",
                lead:
                  locale === "en"
                    ? discoverMediaType === "movie"
                      ? `Here are the ${dedupedLatestItems.length} newest released movies I found in TMDB.`
                      : discoverMediaType === "tv"
                        ? `Here are the ${dedupedLatestItems.length} newest released series I found in TMDB.`
                        : `Here are the ${dedupedLatestItems.length} newest released titles I found in TMDB.`
                    : discoverMediaType === "movie"
                      ? `Hier sind die ${dedupedLatestItems.length} neuesten veröffentlichten Filme, die ich in TMDB gefunden habe.`
                      : discoverMediaType === "tv"
                        ? `Hier sind die ${dedupedLatestItems.length} neuesten veröffentlichten Serien, die ich in TMDB gefunden habe.`
                        : `Hier sind die ${dedupedLatestItems.length} neuesten veröffentlichten Titel, die ich in TMDB gefunden habe.`,
                personalNote:
                  locale === "en"
                    ? "This list is sorted by release date, not by popularity."
                    : "Diese Liste ist nach Veröffentlichungsdatum sortiert, nicht nach Popularität.",
                picks: dedupedLatestItems.map(item => ({
                  title: item.title,
                  mediaType: item.mediaType,
                  reason:
                    locale === "en"
                      ? `Released on ${item.releaseDate ?? "unknown date"}.`
                      : `Veröffentlicht am ${item.releaseDate ?? "unbekannten Datum"}.`,
                  tmdbId: item.tmdbId,
                  href: `/${item.mediaType}/${item.tmdbId}`
                })),
                nextStep:
                  locale === "en"
                    ? "If you want, I can narrow this down by genre, streaming provider, or only animation."
                    : "Wenn du möchtest, grenze ich das nach Genre, Streamingdienst oder nur auf Animation ein."
              }
            });
          }
        }

        if (recentListQualifier && isRecentListDecisionFollowUp(safePrompt)) {
          const recentSuggestedTitles = extractMostRecentSuggestedTitles(safeConversation);
          const recentCandidates = (
            recentSuggestedTitles.length
              ? recentSuggestedTitles
              : references.map(reference => reference.title)
          ).slice(0, 8);

          if (recentCandidates.length) {
            const resolvedRecentCandidates = await Promise.all(
              recentCandidates.map(title =>
                ensureResolvedMediaAllowed(
                  {
                    query: title,
                    mediaType: "all",
                    hints: titleResolutionHints
                  },
                  locale
                )
              )
            );

            const matchedRecentContexts = resolvedRecentCandidates
              .filter(result => result.resolved)
              .map(result => result.resolved!.context)
              .filter((context, index, all) =>
                all.findIndex(
                  candidate =>
                    candidate.mediaType === context.mediaType &&
                    candidate.tmdbId === context.tmdbId
                ) === index
              )
              .filter(context => matchesRecentListQualifier(context, recentListQualifier));

            if (matchedRecentContexts.length) {
              return NextResponse.json({
                mode: "assistant",
                data: {
                  intent: "recommend",
                  lead: buildRecentListQualifierLead(
                    recentListQualifier,
                    matchedRecentContexts,
                    locale
                  ),
                  picks: matchedRecentContexts.slice(0, MAX_ASSISTANT_SUGGESTIONS).map(context => ({
                    title: context.title,
                    mediaType: context.mediaType,
                    reason:
                      locale === "en"
                        ? recentListQualifier === "anime"
                          ? "Animated title from the recent shortlist."
                          : recentListQualifier === "live_action"
                            ? "Live-action title from the recent shortlist."
                            : recentListQualifier === "movie"
                              ? "Movie from the recent shortlist."
                              : "Series from the recent shortlist."
                        : recentListQualifier === "anime"
                          ? "Animierter Titel aus der letzten Liste."
                          : recentListQualifier === "live_action"
                            ? "Live-Action-Titel aus der letzten Liste."
                            : recentListQualifier === "movie"
                              ? "Film aus der letzten Liste."
                              : "Serie aus der letzten Liste.",
                    tmdbId: context.tmdbId,
                    href: `/${context.mediaType}/${context.tmdbId}`
                  })),
                  nextStep:
                    locale === "en"
                      ? "If you want, I can now open the matching detail page or compare these variants."
                      : "Wenn du möchtest, öffne ich dir jetzt direkt die passende Detailseite oder vergleiche die Varianten."
                }
              });
            }
          }
        }

        const characterQuestion = extractCharacterQuestion(safePrompt);
        if (characterQuestion) {
          const recentSuggestedTitles = extractMostRecentSuggestedTitles(safeConversation);
          const preferredTitleMediaType = inferTitleInfoMediaType(
            characterQuestion.title ?? safePrompt,
            parsed.data.mediaType
          );
          const characterTitleQuery =
            characterQuestion.title ??
            extractLikelyTitleQuery(safePrompt) ??
            extractRecentConversationTitleCandidate(safeConversation) ??
            extractRecentAssistantTitleCandidate(safeConversation) ??
            recentSuggestedTitles[0] ??
            references[0]?.title ??
            null;

          let titleContext = pickReferenceForTitleQuery(
            references,
            characterTitleQuery,
            preferredTitleMediaType,
            titleResolutionHints
          );

          if (!titleContext && characterTitleQuery) {
            const resolved = await ensureResolvedMediaAllowed(
              {
                query: characterTitleQuery,
                mediaType: preferredTitleMediaType,
                hints: titleResolutionHints
              },
              locale
            );
            if (resolved.resolved) {
              titleContext = resolved.resolved.context;
            }
          }

          if (titleContext) {
            const characterResponseSchema = z.object({
              lead: z.string().min(1),
              nextStep: z.string().min(1).optional()
            });

            const characterPrompt =
              locale === "en"
                ? [
                    "You answer one focused question about a character inside a movie or series.",
                    "Use the provided title as the anchor context.",
                    "Do not switch to a different title.",
                    "If the question mentions a character, answer directly in 1-3 sentences.",
                    "Be concise, user-facing, and avoid spoilers beyond basic role description.",
                    'Respond as strict JSON: {"lead":"string","nextStep":"string optional"}',
                    `Title context: ${titleContext.title} (${titleContext.mediaType})`,
                    `Overview: ${titleContext.overview ?? "unknown"}`,
                    `Genres: ${titleContext.genres.join(", ") || "unknown"}`,
                    `Cast: ${titleContext.cast?.join(", ") || "unknown"}`,
                    `Question about character "${characterQuestion.character}": ${safePrompt}`
                  ].join("\n")
                : [
                    "Du beantwortest eine fokussierte Frage zu einer Figur innerhalb eines Films oder einer Serie.",
                    "Nutze den bereitgestellten Titel als festen Ankerkontext.",
                    "Wechsle dabei niemals zu einem anderen Titel.",
                    "Wenn nach einer Figur gefragt wird, antworte direkt in 1-3 Sätzen.",
                    "Antworte knapp, nutzerfreundlich und ohne unnötige Spoiler über die Grundrolle hinaus.",
                    'Antworte als striktes JSON: {"lead":"string","nextStep":"string optional"}',
                    `Titelkontext: ${titleContext.title} (${titleContext.mediaType === "tv" ? "Serie" : "Film"})`,
                    `Inhalt: ${titleContext.overview ?? "unbekannt"}`,
                    `Genres: ${titleContext.genres.join(", ") || "unbekannt"}`,
                    `Besetzung: ${titleContext.cast?.join(", ") || "unbekannt"}`,
                    `Frage zur Figur "${characterQuestion.character}": ${safePrompt}`
                  ].join("\n");

            const characterAnswer = await askOpenRouterJsonWithOptions(
              characterPrompt,
              characterResponseSchema,
              {
                temperature: 0.35,
                maxTokens: 350
              }
            );

            return NextResponse.json({
              mode: "assistant",
              data: {
                intent: "title_info",
                lead: characterAnswer.lead,
                picks: [],
                nextStep:
                  characterAnswer.nextStep ??
                  (locale === "en"
                    ? "If you want, I can also explain another character from this title."
                    : "Wenn du möchtest, erkläre ich dir auch noch eine andere Figur aus diesem Titel.")
              }
            });
          }
        }

        const explicitPersonQuery = extractLikelyPersonQuery(safePrompt);
        const personInfoRequested = isPersonInfoIntent(safePrompt) || !!explicitPersonQuery;

        if (personInfoRequested) {
          const personCandidateQuery =
            normalizePersonQueryAlias(
              explicitPersonQuery ??
                safePrompt
              .replace(/\b(nein|bitte|doch|eigentlich|nur)\b/gi, " ")
              .replace(/\b(über|ueber)\b/gi, " ")
              .replace(/\b(den|die|das)\b/gi, " ")
              .replace(/\b(schauspieler|schauspielerin|darsteller|actor|actress|person)\b/gi, " ")
                .trim()
            );

          const personResult = await resolvePersonAIContext({
            query: personCandidateQuery,
            locale
          });

          if (personResult) {
            const personFilmographyRequested =
              explicitRecommendationIntent || isPersonFilmographyRequest(safePrompt);

            if (personFilmographyRequested) {
              const targetMediaType = inferPersonRequestMediaType(safePrompt, parsed.data.mediaType);
              const uniquePicks = personResult.context.topCredits
                .filter(credit => targetMediaType === "all" || credit.mediaType === targetMediaType)
                .map(credit => ({
                  title: credit.title,
                  mediaType: credit.mediaType,
                  reason:
                    locale === "en"
                      ? `${personResult.context.name}: ${credit.roleLabel}`
                      : `${personResult.context.name}: ${credit.roleLabel}`
                }))
                .filter(
                  (pick, index, picks) =>
                    picks.findIndex(
                      candidate =>
                        normalizeAssistantTitleValue(candidate.title) ===
                          normalizeAssistantTitleValue(pick.title) &&
                        candidate.mediaType === pick.mediaType
                    ) === index
                )
                .slice(0, requestedPickCount);
              const resolvedFilmographyPicks = await resolveAllowedAIPicks(uniquePicks, locale);

              if (resolvedFilmographyPicks.length) {
                const typeLabel =
                  targetMediaType === "movie"
                    ? locale === "en"
                      ? "movies"
                      : "Filme"
                    : targetMediaType === "tv"
                      ? locale === "en"
                        ? "series"
                        : "Serien"
                      : locale === "en"
                        ? "titles"
                        : "Titel";

                return NextResponse.json({
                  mode: "assistant",
                  data: {
                    intent: "recommend",
                    lead:
                      locale === "en"
                        ? `Here are ${resolvedFilmographyPicks.length} ${typeLabel} with ${personResult.context.name}.`
                        : `Hier sind ${resolvedFilmographyPicks.length} ${typeLabel} mit ${personResult.context.name}.`,
                    picks: resolvedFilmographyPicks,
                    nextStep:
                      locale === "en"
                        ? "If you want, I can suggest similar picks for one of these titles."
                        : "Wenn du möchtest, kann ich dir zu einem dieser Titel ähnliche Empfehlungen geben."
                  }
                });
              }
            }

            return NextResponse.json({
              mode: "assistant",
              data: {
                intent: "title_info",
                lead: buildPersonInfoLead({
                  ...personResult.context,
                  locale
                }),
                picks: [],
                nextStep:
                  locale === "en"
                    ? "Do you want recommendations of movies or series with this person?"
                    : "Möchtest du Empfehlungen für Filme oder Serien mit dieser Person?"
              }
            });
          }
        }

        if (isDirectLinkRequest(safePrompt)) {
          const recentSuggestedTitles = extractMostRecentSuggestedTitles(safeConversation);
          const directLinkTitleQuery = extractDirectLinkTargetTitle(safePrompt);
          const explicitLinkTitleQuery =
            directLinkTitleQuery ??
            extractLikelyTitleQuery(safePrompt) ??
            extractStandaloneTitleCandidate(safePrompt);
          const implicitSuggestedTitle = findSuggestedTitleMentionInPrompt(
            safePrompt,
            recentSuggestedTitles
          );
          const preferredTitleMediaType = inferTitleInfoMediaType(
            safePrompt,
            parsed.data.mediaType
          );
          const inferredLinkTitleQuery =
            explicitLinkTitleQuery ??
            implicitSuggestedTitle ??
            extractRecentConversationTitleCandidate(safeConversation) ??
            extractRecentAssistantTitleCandidate(safeConversation) ??
            recentSuggestedTitles[0] ??
            references[0]?.title ??
            null;

          let linkContext: AITitleContext | null = null;

          if (explicitLinkTitleQuery) {
            const resolved = await ensureResolvedMediaAllowed(
              {
                query: explicitLinkTitleQuery,
                mediaType: preferredTitleMediaType,
                hints: titleResolutionHints
              },
              locale
            );

            if (resolved.resolved) {
              linkContext = resolved.resolved.context;
            }

            if (!linkContext) {
              linkContext = pickReferenceForTitleQuery(
                references,
                explicitLinkTitleQuery,
                preferredTitleMediaType,
                titleResolutionHints
              );
            }
          }

          if (!linkContext && inferredLinkTitleQuery) {
            linkContext = pickReferenceForTitleQuery(
              references,
              inferredLinkTitleQuery,
              preferredTitleMediaType,
              titleResolutionHints
            );

            if (!linkContext) {
              const resolved = await ensureResolvedMediaAllowed(
                {
                  query: inferredLinkTitleQuery,
                  mediaType: preferredTitleMediaType,
                  hints: titleResolutionHints
                },
                locale
              );

              if (resolved.resolved) {
                linkContext = resolved.resolved.context;
              }
            }
          }

          if (linkContext) {
            return NextResponse.json({
              mode: "assistant",
              data: {
                intent: "title_info",
                lead:
                  locale === "en"
                    ? `Here is the direct link to ${linkContext.title}.`
                    : `Hier ist der direkte Link zu ${linkContext.title}.`,
                picks: [
                  {
                    title: linkContext.title,
                    mediaType: linkContext.mediaType,
                    reason:
                      locale === "en"
                        ? "Open the detail page for trailers, cast, ratings and similar picks."
                        : "Öffne die Detailseite mit Trailer, Besetzung, Bewertungen und ähnlichen Titeln.",
                    tmdbId: linkContext.tmdbId,
                    href: `/${linkContext.mediaType}/${linkContext.tmdbId}`
                  }
                ],
                nextStep: text.linkProvidedNext
              }
            });
          }

          return NextResponse.json({
            mode: "assistant",
            data: {
              intent: "clarify",
              lead: text.linkMissingLead,
              picks: [],
              nextStep: text.linkMissingNext
            }
          });
        }

        const deterministicTitleInfoRequest =
          !explicitRecommendationIntent &&
          (isComprehensiveTitleInfoRequest(safePrompt) ||
            isStreamingAvailabilityPrompt(safePrompt) ||
            isTitleDetailFollowUpPrompt(safePrompt) ||
            isTitleInfoFollowUpIntent(safePrompt));

        if (deterministicTitleInfoRequest) {
          const recentSuggestedTitles = extractMostRecentSuggestedTitles(safeConversation);
          const implicitSuggestedTitle = findSuggestedTitleMentionInPrompt(
            safePrompt,
            recentSuggestedTitles
          );
          const preferredTitleMediaType = inferTitleInfoMediaType(
            safePrompt,
            parsed.data.mediaType
          );
          const inferredTitleQuery =
            implicitSuggestedTitle ??
            extractLikelyTitleQuery(safePrompt) ??
            extractStandaloneTitleCandidate(safePrompt) ??
            extractRecentConversationTitleCandidate(safeConversation) ??
            extractRecentAssistantTitleCandidate(safeConversation) ??
            recentSuggestedTitles[0] ??
            references[0]?.title ??
            null;

          let titleContext = pickReferenceForTitleQuery(
            references,
            inferredTitleQuery,
            preferredTitleMediaType,
            titleResolutionHints
          );

          if (!titleContext && inferredTitleQuery) {
            const resolved = await ensureResolvedMediaAllowed(
              {
                query: inferredTitleQuery,
                mediaType: preferredTitleMediaType,
                hints: titleResolutionHints
              },
              locale
            );
            if (resolved.resolved) {
              titleContext = resolved.resolved.context;
            }
          }

          if (titleContext) {
            const detailLead = await buildTitleDetailLead(
              titleContext,
              safePrompt,
              locale,
              requestedWatchRegion
            );
            const lead =
              detailLead ??
              (isComprehensiveTitleInfoRequest(safePrompt) || isTitleInfoFollowUpIntent(safePrompt)
                ? await buildComprehensiveTitleInfoLead(
                    titleContext,
                    locale,
                    requestedWatchRegion
                  )
                : buildTitleInfoLead(titleContext, locale));

            return NextResponse.json({
              mode: "assistant",
              data: {
                intent: "title_info",
                lead,
                picks: [],
                nextStep: text.titleInfoNext
              }
            });
          }
        }

        const data = await getAssistantStructuredOrFallback({
          prompt: assistantPrompt(
            {
              prompt: safePrompt,
              mediaType: parsed.data.mediaType,
              desiredPickCount: requestedPickCount,
              timeBudget: safeTimeBudget,
              mood: safeMood,
              episodeRuntimePreference: episodeRuntimePreference
                ? formatEpisodeRuntimePreference(episodeRuntimePreference, locale)
                : undefined,
              intensity: parsed.data.intensity,
              socialContext: parsed.data.socialContext,
              references,
              feedback: parsed.data.feedback,
              conversation: safeConversation
            },
            locale
          ),
          locale,
          requestedPickCount
        });

        let normalizedLead = data.lead;
        let normalizedNextStep = data.nextStep;
        const forceDeterministicTitleInfo =
          data.intent === "title_info" &&
          (isComprehensiveTitleInfoRequest(safePrompt) ||
            isStreamingAvailabilityPrompt(safePrompt) ||
            isTitleDetailFollowUpPrompt(safePrompt) ||
            isTitleInfoFollowUpIntent(safePrompt));
        if (
          data.intent === "title_info" &&
          (forceDeterministicTitleInfo || isWeakTitleInfoLead(data.lead, locale))
        ) {
          const recentSuggestedTitles = extractMostRecentSuggestedTitles(safeConversation);
          const directTitleQuery = extractLikelyTitleQuery(safePrompt);
          const standaloneTitleCandidate = extractStandaloneTitleCandidate(safePrompt);
          const implicitSuggestedTitle = findSuggestedTitleMentionInPrompt(
            safePrompt,
            recentSuggestedTitles
          );
          const inferredConversationTitle = extractRecentConversationTitleCandidate(safeConversation);
          const preferredTitleMediaType = inferTitleInfoMediaType(
            safePrompt,
            parsed.data.mediaType
          );
          const fallbackTitleQuery =
            directTitleQuery ??
            standaloneTitleCandidate ??
            implicitSuggestedTitle ??
            inferredConversationTitle ??
            recentSuggestedTitles[0] ??
            null;

          let titleContext = pickReferenceForTitleQuery(
            references,
            fallbackTitleQuery,
            preferredTitleMediaType,
            titleResolutionHints
          );
          if (!titleContext && fallbackTitleQuery) {
            const resolved = await ensureResolvedMediaAllowed(
              {
                query: fallbackTitleQuery,
                mediaType: preferredTitleMediaType,
                hints: titleResolutionHints
              },
              locale
            );
            if (resolved.resolved) {
              titleContext = resolved.resolved.context;
            }
          }

          if (titleContext) {
            const detailLead = await buildTitleDetailLead(
              titleContext,
              safePrompt,
              locale,
              requestedWatchRegion
            );
            normalizedLead =
              detailLead ??
              (isComprehensiveTitleInfoRequest(safePrompt) || isTitleInfoFollowUpIntent(safePrompt)
                ? await buildComprehensiveTitleInfoLead(
                    titleContext,
                    locale,
                    requestedWatchRegion
                  )
                : buildExtendedTitleInfoLead(titleContext, locale));
            normalizedNextStep = text.titleInfoNext;
          }
        }

        const blockedTitles = noveltyRequested
          ? new Set<string>([
              ...extractPreviouslySuggestedTitles(parsed.data.conversation),
              ...parsed.data.feedback
                .filter(item => item.watched)
                .map(item => normalizeAssistantTitleValue(item.title))
            ])
          : new Set<string>();
        const resolvedPicks = await resolveAllowedAIPicks(data.picks, locale);
        const noveltyFilteredPicks = noveltyRequested && data.intent === "recommend"
          ? resolvedPicks.filter(
              pick => !blockedTitles.has(normalizeAssistantTitleValue(pick.title))
            )
          : resolvedPicks;

        let normalizedRecommendPicks: Array<{
          title: string;
          mediaType: "movie" | "tv";
          reason: string;
          comparableTitle?: string;
          tmdbId?: number;
          href?: string;
        }> = data.intent === "recommend" ? noveltyFilteredPicks : [];

        if (data.intent === "recommend" && requestedSeasonCount !== null) {
          const seasonCandidates = normalizedRecommendPicks.filter(
            pick => pick.mediaType === "tv" && typeof pick.tmdbId === "number"
          ) as Array<(typeof normalizedRecommendPicks)[number] & { tmdbId: number; mediaType: "tv" }>;
          const seasonFiltered = await filterAIPicksBySeasonCount(
            seasonCandidates,
            requestedSeasonCount,
            locale
          );
          normalizedRecommendPicks = seasonFiltered;
        }

        if (data.intent === "recommend" && episodeRuntimePreference) {
          normalizedRecommendPicks = await filterAssistantPicksByEpisodeRuntime(
            normalizedRecommendPicks,
            episodeRuntimePreference,
            locale
          );
        }

        const assistantPicks =
          data.intent === "recommend"
            ? normalizedRecommendPicks.slice(0, requestedPickCount)
            : [];
        const partialRecommendResult =
          data.intent === "recommend" &&
          assistantPicks.length > 0 &&
          assistantPicks.length < requestedPickCount;
        const noRecommendPicks =
          data.intent === "recommend" && assistantPicks.length === 0;

        const parsedLeadCount =
          data.intent === "recommend" ? parseLeadCount(normalizedLead ?? "") : null;
        const lead = data.intent !== "recommend"
          ? normalizedLead
          : noRecommendPicks
            ? normalizedLead || text.noSafePicksLead
            : cappedBySystem
              ? text.cappedSuggestionsLead(requestedRaw, requestedPickCount, assistantPicks.length)
              : partialRecommendResult
                ? text.partialSuggestionsLead(assistantPicks.length, requestedPickCount)
                : parsedLeadCount !== null && parsedLeadCount !== assistantPicks.length
                  ? text.exactSuggestionsLead(assistantPicks.length)
                  : normalizedLead;
        const nextStep = data.intent !== "recommend"
          ? normalizedNextStep
          : noRecommendPicks
            ? normalizedNextStep || text.noSafePicksNext
            : cappedBySystem
              ? text.cappedSuggestionsNext
              : partialRecommendResult
                ? text.partialSuggestionsNext
                : normalizedNextStep;

        return NextResponse.json({
          mode: "assistant",
          data: {
            ...data,
            lead,
            nextStep,
            picks: assistantPicks
          }
        });
      }

      case "title_insights": {
        const result = await ensureResolvedMediaAllowed(parsed.data.title, locale);

        if (!result.resolved) {
          return NextResponse.json(
            { error: result.error ?? text.unresolved },
            { status: result.status }
          );
        }

        const resolved = result.resolved;

        const data = await askOpenRouterJson(
          titleInsightsPrompt(resolved.context, locale),
          aiTitleInsightsResponseSchema
        );

        return NextResponse.json({
          mode: "title_insights",
          data,
          resolved: {
            title: resolved.context.title,
            href: resolved.href
          }
        });
      }

      case "person_insights": {
        const person = await getPersonAIContext(parsed.data.personId, locale);
        const data = await askOpenRouterJson(
          personInsightsPrompt(person, locale),
          aiPersonInsightsResponseSchema
        );

        return NextResponse.json({
          mode: "person_insights",
          data
        });
      }
    }
  } catch (error) {
    console.error("[api/ai/assistant] failed:", error);
    const mapped = mapAssistantRuntimeError(error, locale);

    return NextResponse.json(
      {
        error: mapped.error
      },
      { status: mapped.status }
    );
  }
}
