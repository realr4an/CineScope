import { NextResponse } from "next/server";

import { getAgeAccessForMedia } from "@/lib/age-gate/server";
import {
  getMediaAIContext,
  getManyMediaAIContexts,
  getPersonAIContext,
  resolveMediaAIContext
} from "@/lib/ai/context";
import {
  filterAIPicksBySeasonCount,
  resolveAIPicks,
  resolveAllowedAIPicks
} from "@/lib/ai/formatters";
import { getDiscoverResults } from "@/lib/tmdb/discover";
import { askOpenRouterJson } from "@/lib/ai/openrouter";
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
import { ZodError } from "zod";
import type { AITitleContext } from "@/lib/ai/types";

const MAX_ASSISTANT_SUGGESTIONS = 8;
type EpisodeRuntimePreference = {
  mode: "around" | "max" | "min";
  minutes: number;
  tolerance: number;
};

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
          "Willst du als Naechstes aehnliche Titel oder einen kurzen Fit-Check zu deinem Geschmack?",
        titleInfoClarify:
          "Gern. Nenne mir bitte den genauen Titel, damit ich sicher dazu antworten kann.",
        forbiddenOrigin: "Cross-Origin-Anfragen sind nicht erlaubt.",
        rateLimited: "Zu viele KI-Anfragen. Bitte versuche es gleich erneut.",
        unsafePrompt: "Die Anfrage enthält unsichere Instruktionsmuster.",
        unsafePromptLead:
          "Dabei kann ich nicht helfen. Ich unterstütze dich bei Filmen, Serien und sicheren Empfehlungsanfragen.",
        unsafePromptNext:
          "Versuche zum Beispiel: 'Empfiehl mir 6 dystopische Sci-Fi-Filme ähnlich wie Blade Runner.'"
      };
}

function isAnimeIntent(input: {
  prompt?: string;
  conversation?: Array<{ content: string }>;
}) {
  const combined = [input.prompt ?? "", ...(input.conversation ?? []).map(message => message.content)]
    .join(" \n ")
    .toLowerCase();

  return /\banime\b|\bmanga\b|studio ghibli|shonen|shōnen|japan(?:isch|ese)?|trickfilm|zeichentrick|anim(?:e|ation)/.test(
    combined
  );
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

function hasLatinCharacters(value: string) {
  return /[a-z]/i.test(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
  );
}

async function topUpAssistantPicks(input: {
  picks: Array<{
    title: string;
    mediaType: "movie" | "tv";
    reason: string;
    comparableTitle?: string;
    tmdbId?: number;
    href?: string;
  }>;
  requestedPickCount: number;
  mediaType: "all" | "movie" | "tv";
  animeIntent: boolean;
  noveltyRequested: boolean;
  episodeRuntimePreference?: EpisodeRuntimePreference | null;
  blockedTitles: Set<string>;
  locale: Locale;
}) {
  const missing = input.requestedPickCount - input.picks.length;
  if (missing <= 0) {
    return input.picks;
  }

  const seenIds = new Set(
    input.picks
      .map(pick => (typeof pick.tmdbId === "number" ? `${pick.mediaType}-${pick.tmdbId}` : null))
      .filter(Boolean) as string[]
  );
  const seenTitles = new Set(input.picks.map(pick => normalizeAssistantTitleValue(pick.title)));
  for (const blockedTitle of input.blockedTitles) {
    if (blockedTitle) {
      seenTitles.add(blockedTitle);
    }
  }

  const candidateTypes: Array<"movie" | "tv"> =
    input.episodeRuntimePreference
      ? ["tv"]
      : input.mediaType === "all"
      ? input.animeIntent
        ? ["tv", "movie"]
        : ["movie", "tv"]
      : [input.mediaType];
  const fallbackReason =
    input.locale === "en"
      ? "Strong current match from TMDB discovery."
      : "Passender aktueller Treffer aus der TMDB-Discovery.";
  const toppedUp = [...input.picks];

  const candidatePages = input.noveltyRequested ? [2, 3, 4, 1] : [1, 2];

  for (const mediaType of candidateTypes) {
    if (toppedUp.length >= input.requestedPickCount) {
      break;
    }

    for (const page of candidatePages) {
      if (toppedUp.length >= input.requestedPickCount) {
        break;
      }

      const discover = await getDiscoverResults({
        mediaType,
        genre: input.animeIntent ? 16 : undefined,
        page,
        sort: "vote_count.desc",
        locale: input.locale
      });

      for (const item of discover.items) {
        if (toppedUp.length >= input.requestedPickCount) {
          break;
        }

        const idKey = `${item.mediaType}-${item.tmdbId}`;
        const normalizedTitle = normalizeAssistantTitleValue(item.title);
        if (seenIds.has(idKey) || seenTitles.has(normalizedTitle)) {
          continue;
        }

        if ((input.locale === "de" || input.locale === "en") && !hasLatinCharacters(item.title)) {
          continue;
        }

        const access = await getAgeAccessForMedia(item.mediaType, item.tmdbId);
        if (!access.allowed) {
          continue;
        }

        if (input.episodeRuntimePreference && item.mediaType === "tv") {
          const tvContext = await getMediaAIContext("tv", item.tmdbId, input.locale);
          const runtime = tvContext.runtime;

          if (!runtime || !matchesEpisodeRuntime(runtime, input.episodeRuntimePreference)) {
            continue;
          }
        }

        seenIds.add(idKey);
        seenTitles.add(normalizedTitle);
        toppedUp.push({
          title: item.title,
          mediaType: item.mediaType,
          reason: fallbackReason,
          tmdbId: item.tmdbId,
          href: `/${item.mediaType}/${item.tmdbId}`
        });
      }
    }
  }

  return toppedUp;
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
      : "Ich habe aktuell keine ausfuehrliche Inhaltsbeschreibung im Datensatz.");

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

function buildTitleDetailLead(title: AITitleContext, prompt: string, locale: Locale) {
  const normalized = prompt.toLowerCase();
  const unknown =
    locale === "en"
      ? "I do not have that detail in the current data snapshot."
      : "Dazu habe ich im aktuellen Datensatz keine verlässliche Angabe.";

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
    return buildExtendedTitleInfoLead(title, locale);
  }

  return null;
}

function pickReferenceForTitleQuery(
  references: AITitleContext[],
  titleQuery: string | null
) {
  if (!titleQuery) {
    return references[0] ?? null;
  }

  const query = normalizeTitleForLookup(titleQuery);
  if (!query) {
    return references[0] ?? null;
  }

  return (
    references.find(reference => {
      const title = normalizeTitleForLookup(reference.title);
      const original = normalizeTitleForLookup(reference.originalTitle);
      return title.includes(query) || query.includes(title) || original.includes(query);
    }) ??
    references[0] ??
    null
  );
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
    neun: 9,
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
    neun_de: 9,
    zehn: 10
  };

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
    /(?:^|\s)(\d{1,2})\s*(?:filme?|series?|movies?|serien?|anime|animes?|shows?|titel|title|vorschl[aä]ge?|picks?|trickfilme?|zeichentrick(?:filme?)?|cartoons?|animationsfilme?)(?:\s|$)/
  );

  if (nounDigitMatch) {
    return Number(nounDigitMatch[1]);
  }

  const quantifiedNounDigitMatch = normalized.match(
    /(?:^|\s)(\d{1,2})\s*(?:neue?n?|weitere?n?|more|extra|zus[aä]tzliche?n?|st[uü]ck|stücke|items?)?\s*(?:filme?|series?|movies?|serien?|anime|animes?|shows?|titel|title|vorschl[aä]ge?|picks?|trickfilme?|zeichentrick(?:filme?)?|cartoons?|animationsfilme?)(?:\s|$)/
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

  for (const [word, count] of Object.entries(wordToNumber)) {
    const normalizedWord = word.replace("_de", "");
    const matcher = new RegExp(`(^|\\s)${normalizedWord}(\\s|$)`, "i");
    if (matcher.test(normalized)) {
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

async function filterAssistantPicksByEpisodeRuntime(
  picks: Array<{
    title: string;
    mediaType: "movie" | "tv";
    reason: string;
    comparableTitle?: string;
    tmdbId?: number;
    href?: string;
  }>,
  preference: EpisodeRuntimePreference,
  locale: Locale
) {
  const tvCandidates = picks.filter(
    (pick): pick is (typeof picks)[number] & { tmdbId: number; mediaType: "tv" } =>
      pick.mediaType === "tv" && typeof pick.tmdbId === "number"
  );

  if (!tvCandidates.length) {
    return [] as typeof picks;
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

  return tvCandidates.filter(candidate => allowedIds.has(candidate.tmdbId));
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
  const normalized = input.trim();

  if (!normalized) {
    return null;
  }

  const patterns = [
    /(?:mehr\s+über|infos?\s+zu|info\s+zu|was\s+wei[sß]t\s+du\s+über)\s+["„“]?(.+?)["“”]?(?:\s+(?:wissen|erfahren))?\s*[.!?]?$/i,
    /(?:worum\s+geht\s+es\s+in|worum\s+geht'?s\s+in)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
    /(?:was\s+passiert\s+in)\s+["„“]?(.+?)["“”]?\s*[.!?]?$/i,
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
            sanitizedBody.conversation = sanitizedBody.conversation.slice(-20);
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

        if (
          isSuggestionCapacityQuestion({
            prompt: parsed.data.prompt,
            conversation: parsed.data.conversation
          })
        ) {
          return NextResponse.json({
            mode: "assistant",
            data: {
              lead: text.maxSuggestionsInfo,
              picks: [],
              nextStep: text.maxSuggestionsNext
            }
          });
        }

        const mostRecentSuggestedTitles = extractMostRecentSuggestedTitles(parsed.data.conversation);
        const wantsDecisionFromRecentList = isRecentListDecisionFollowUp(safePrompt);

        if (wantsDecisionFromRecentList && mostRecentSuggestedTitles.length > 0) {
          const resolvedShortlist = await Promise.all(
            mostRecentSuggestedTitles.slice(0, 8).map(title =>
              ensureResolvedMediaAllowed({ query: title, mediaType: "all" }, locale)
            )
          );

          const shortlistContexts = resolvedShortlist
            .filter(item => item.resolved)
            .map(item => item.resolved!.context);

          if (shortlistContexts.length > 0) {
            const desiredCount = getDesiredShortlistCount(safePrompt, shortlistContexts.length);
            const selected = [...shortlistContexts]
              .sort((left, right) => scoreContextForShortlist(right) - scoreContextForShortlist(left))
              .slice(0, desiredCount)
              .map((context, index) => ({
                title: context.title,
                mediaType: context.mediaType,
                reason: buildShortlistReason(index, locale),
                tmdbId: context.tmdbId,
                href: `/${context.mediaType}/${context.tmdbId}`
              }));

            const lead =
              locale === "en"
                ? selected.length === 1
                  ? `From your last list, I would start with ${selected[0].title}.`
                  : `From your last list, these are my top ${selected.length} picks.`
                : selected.length === 1
                  ? `Aus deiner letzten Liste würde ich mit ${selected[0].title} starten.`
                  : `Aus deiner letzten Liste sind das meine Top-${selected.length}-Empfehlungen.`;

            const nextStep =
              locale === "en"
                ? "Want details on one of these titles, or should I rank the remaining list as well?"
                : "Willst du zu einem davon mehr Details oder soll ich dir auch die restliche Liste priorisieren?";

            return NextResponse.json({
              mode: "assistant",
              data: {
                lead,
                picks: selected,
                nextStep
              }
            });
          }
        }

        const requestedSeasonCount = getRequestedSeasonCount({
          prompt: parsed.data.prompt,
          conversation: parsed.data.conversation
        });
        const episodeRuntimePreference = getRequestedEpisodeRuntime({
          prompt: parsed.data.prompt,
          conversation: parsed.data.conversation,
          mediaType: parsed.data.mediaType
        });
        const noveltyRequested = isNoveltyRequest({
          prompt: parsed.data.prompt,
          conversation: parsed.data.conversation
        });
        const { requestedPickCount, requestedRaw, cappedBySystem } = getRequestedPickCount({
          prompt: parsed.data.prompt,
          conversation: parsed.data.conversation
        });
        const animeIntent = isAnimeIntent({
          prompt: parsed.data.prompt,
          conversation: parsed.data.conversation
        });
        const explicitReferenceResults = await Promise.all(
          safeReferenceTitles.map(reference => ensureResolvedMediaAllowed(reference, locale))
        );
        const references = explicitReferenceResults
          .filter(result => result.resolved)
          .map(result => result.resolved!.context);

        if (references.length < 3) {
          const recentSuggestedTitles = extractMostRecentSuggestedTitles(parsed.data.conversation);
          const inferredCandidates = [
            extractLikelyTitleQuery(safePrompt),
            extractStandaloneTitleCandidate(safePrompt),
            extractRecentConversationTitleCandidate(parsed.data.conversation),
            ...recentSuggestedTitles.slice(0, 4),
            ...parsed.data.conversation
              .filter(message => message.role === "user")
              .slice(-6)
              .map(message => extractLikelyTitleQuery(message.content)),
            ...parsed.data.conversation
              .filter(message => message.role === "user")
              .slice(-4)
              .map(message => extractStandaloneTitleCandidate(message.content))
          ].filter((value): value is string => !!value);

          for (const query of inferredCandidates) {
            if (references.length >= 3) {
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
                mediaType: "all"
              },
              locale
            );

            if (resolved.resolved) {
              references.push(resolved.resolved.context);
            }
          }
        }

        const titleInfoRequested = isTitleInfoRequest({
          prompt: safePrompt,
          conversation: parsed.data.conversation
        });
        const titleDetailFollowUp = isTitleDetailFollowUpPrompt(safePrompt);
        const directTitleQuery = extractLikelyTitleQuery(safePrompt);
        const standaloneTitleCandidate = extractStandaloneTitleCandidate(safePrompt);
        const latestSuggestedTitles = extractMostRecentSuggestedTitles(parsed.data.conversation);
        const askedForExactTitle = assistantRequestedExactTitle(parsed.data.conversation);
        const fallbackTitleQuery = directTitleQuery ?? (askedForExactTitle ? standaloneTitleCandidate : null);
        const recommendationRequested = isRecommendationRequest({
          prompt: safePrompt,
          conversation: parsed.data.conversation
        });
        const explicitRecommendationIntent = isExplicitRecommendationIntent(safePrompt);
        const titleDetailMode = titleDetailFollowUp && !explicitRecommendationIntent;
        const preferenceSignalsAvailable = hasPreferenceSignals({
          prompt: safePrompt,
          conversation: parsed.data.conversation,
          timeBudget: safeTimeBudget,
          mood: safeMood,
          intensity: parsed.data.intensity,
          socialContext: parsed.data.socialContext,
          referencesCount: references.length
        });
        const inferredConversationTitle = extractRecentConversationTitleCandidate(parsed.data.conversation);
        const effectiveTitleQuery =
          fallbackTitleQuery ?? inferredConversationTitle ?? latestSuggestedTitles[0] ?? null;

        if (
          (titleInfoRequested && !explicitRecommendationIntent) ||
          (titleDetailMode && (references.length > 0 || !!effectiveTitleQuery)) ||
          (askedForExactTitle && !!standaloneTitleCandidate && !explicitRecommendationIntent)
        ) {
          let titleContext = pickReferenceForTitleQuery(references, effectiveTitleQuery ?? directTitleQuery);

          if (!titleContext && effectiveTitleQuery) {
            const resolved = await ensureResolvedMediaAllowed(
              { query: effectiveTitleQuery, mediaType: "all" },
              locale
            );

            if (resolved.resolved) {
              titleContext = resolved.resolved.context;
            }
          }

          if (!titleContext) {
            return NextResponse.json({
              mode: "assistant",
              data: {
                lead: text.titleInfoClarify,
                picks: [],
                nextStep:
                  locale === "en"
                    ? "For example: 'what is The Mandalorian about?'"
                    : "Zum Beispiel: 'Worum geht es in The Mandalorian?'"
              }
            });
          }

          return NextResponse.json({
            mode: "assistant",
            data: {
              lead: buildTitleDetailLead(titleContext, safePrompt, locale) ?? buildTitleInfoLead(titleContext, locale),
              picks: [],
              nextStep: text.titleInfoNext
            }
          });
        }

        if (titleDetailMode && !references.length && !effectiveTitleQuery) {
          return NextResponse.json({
            mode: "assistant",
            data: {
              lead: text.titleInfoClarify,
              picks: [],
              nextStep:
                locale === "en"
                  ? "For example: 'what is The Mandalorian about?'"
                  : "Zum Beispiel: 'Worum geht es in The Mandalorian?'"
            }
          });
        }

        if (recommendationRequested && !titleInfoRequested && !preferenceSignalsAvailable) {
          return NextResponse.json({
            mode: "assistant",
            data: {
              lead: text.clarifyPreferencesLead,
              picks: [],
              nextStep: text.clarifyPreferencesNext
            }
          });
        }

        const data = await askOpenRouterJson(
          assistantPrompt(
            {
              prompt: safePrompt,
              mediaType: parsed.data.mediaType,
              desiredPickCount: requestedPickCount,
              timeBudget: safeTimeBudget,
              episodeRuntimePreference: episodeRuntimePreference
                ? formatEpisodeRuntimePreference(episodeRuntimePreference, locale)
                : undefined,
              mood: safeMood,
              intensity: parsed.data.intensity,
              socialContext: parsed.data.socialContext,
              references,
              feedback: parsed.data.feedback,
              conversation: safeConversation
            },
            locale
          ),
          aiAssistantResponseSchema
        );
        const blockedTitles = noveltyRequested
          ? new Set<string>([
              ...extractPreviouslySuggestedTitles(parsed.data.conversation),
              ...parsed.data.feedback
                .filter(item => item.watched)
                .map(item => normalizeAssistantTitleValue(item.title))
            ])
          : new Set<string>();
        const resolvedPicks = await resolveAllowedAIPicks(data.picks, locale);
        const noveltyFilteredPicks = noveltyRequested
          ? resolvedPicks.filter(
              pick => !blockedTitles.has(normalizeAssistantTitleValue(pick.title))
            )
          : resolvedPicks;
        const picksAfterSeasonFilter = requestedSeasonCount
          ? await filterAIPicksBySeasonCount(
              noveltyFilteredPicks.filter(
                (
                  pick
                ): pick is (typeof resolvedPicks)[number] & {
                  tmdbId: number;
                  mediaType: "tv";
                } => pick.mediaType === "tv" && typeof pick.tmdbId === "number"
              ),
              requestedSeasonCount,
              locale
            )
          : noveltyFilteredPicks;
        const picksAfterRuntimeFilter = episodeRuntimePreference
          ? await filterAssistantPicksByEpisodeRuntime(
              picksAfterSeasonFilter,
              episodeRuntimePreference,
              locale
            )
          : picksAfterSeasonFilter;
        const toppedUpPicks = await topUpAssistantPicks({
          picks: picksAfterRuntimeFilter,
          requestedPickCount,
          mediaType: episodeRuntimePreference ? "tv" : parsed.data.mediaType,
          animeIntent,
          noveltyRequested,
          episodeRuntimePreference,
          blockedTitles,
          locale
        });
        const limitedPicks = toppedUpPicks.slice(0, requestedPickCount);
        const emptyPicksAfterFiltering = data.picks.length > 0 && limitedPicks.length === 0;
        const leadCount = parseLeadCount(data.lead);
        const leadCountMismatch = leadCount !== null && leadCount !== limitedPicks.length;
        const partialResult = limitedPicks.length > 0 && limitedPicks.length < requestedPickCount;
        const lead = emptyPicksAfterFiltering
          ? text.noSafePicksLead
          : cappedBySystem
            ? text.cappedSuggestionsLead(requestedRaw, requestedPickCount, limitedPicks.length)
          : partialResult
            ? text.partialSuggestionsLead(limitedPicks.length, requestedPickCount)
            : leadCountMismatch
              ? text.exactSuggestionsLead(limitedPicks.length)
              : data.lead;
        const nextStep = emptyPicksAfterFiltering
          ? text.noSafePicksNext
          : cappedBySystem
            ? text.cappedSuggestionsNext
          : partialResult
            ? text.partialSuggestionsNext
            : data.nextStep;

        return NextResponse.json({
          mode: "assistant",
          data: {
            ...data,
            lead,
            nextStep,
            picks: limitedPicks
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
    if (error instanceof ZodError) {
      return NextResponse.json({ error: text.aiActionFailedFriendly }, { status: 502 });
    }

    console.error("[api/ai/assistant] failed:", error);

    return NextResponse.json(
      {
        error: text.aiActionFailedFriendly
      },
      { status: 500 }
    );
  }
}
