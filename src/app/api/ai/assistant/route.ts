import { NextResponse } from "next/server";

import { getAgeAccessForMedia } from "@/lib/age-gate/server";
import {
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

const MAX_ASSISTANT_SUGGESTIONS = 8;

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
        forbiddenOrigin: "Cross-origin requests are not allowed.",
        rateLimited: "Too many AI requests. Please try again in a moment.",
        unsafePrompt: "The request contains unsafe instruction patterns."
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
        forbiddenOrigin: "Cross-Origin-Anfragen sind nicht erlaubt.",
        rateLimited: "Zu viele KI-Anfragen. Bitte versuche es gleich erneut.",
        unsafePrompt: "Die Anfrage enthält unsichere Instruktionsmuster."
      };
}

function isAnimeIntent(input: {
  prompt?: string;
  conversation?: Array<{ content: string }>;
}) {
  const combined = [input.prompt ?? "", ...(input.conversation ?? []).map(message => message.content)]
    .join(" \n ")
    .toLowerCase();

  return /\banime\b|\bmanga\b|studio ghibli|shonen|shōnen/.test(combined);
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
  const seenTitles = new Set(input.picks.map(pick => pick.title.trim().toLowerCase()));

  const candidateTypes: Array<"movie" | "tv"> =
    input.mediaType === "all"
      ? input.animeIntent
        ? ["tv", "movie"]
        : ["movie", "tv"]
      : [input.mediaType];
  const fallbackReason =
    input.locale === "en"
      ? "Strong current match from TMDB discovery."
      : "Passender aktueller Treffer aus der TMDB-Discovery.";
  const toppedUp = [...input.picks];

  for (const mediaType of candidateTypes) {
    if (toppedUp.length >= input.requestedPickCount) {
      break;
    }

    const discover = await getDiscoverResults({
      mediaType,
      genre: input.animeIntent ? 16 : undefined,
      page: 1,
      sort: "popularity.desc",
      locale: input.locale
    });

    for (const item of discover.items) {
      if (toppedUp.length >= input.requestedPickCount) {
        break;
      }

      const idKey = `${item.mediaType}-${item.tmdbId}`;
      const titleKey = item.title.trim().toLowerCase();
      if (seenIds.has(idKey) || seenTitles.has(titleKey)) {
        continue;
      }

      const access = await getAgeAccessForMedia(item.mediaType, item.tmdbId);
      if (!access.allowed) {
        continue;
      }

      seenIds.add(idKey);
      seenTitles.add(titleKey);
      toppedUp.push({
        title: item.title,
        mediaType: item.mediaType,
        reason: fallbackReason,
        tmdbId: item.tmdbId,
        href: `/${item.mediaType}/${item.tmdbId}`
      });
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
    /(?:^|\s)(\d{1,2})\s*(?:filme?|series?|movies?|serien?|anime|animes?|shows?|titel|title|vorschl[aä]ge?|picks?)(?:\s|$)/
  );

  if (nounDigitMatch) {
    return Number(nounDigitMatch[1]);
  }

  const requestDigitMatch = normalized.match(
    /(?:kannst\s+du|can\s+you|please|bitte|auch)\D{0,12}(\d{1,2})(?:\s|$)/
  );

  if (requestDigitMatch) {
    return Number(requestDigitMatch[1]);
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
  conversation?: Array<{ content: string }>;
}) {
  let requestedRaw = 5;
  const fromPrompt = input.prompt ? parseRequestedCount(input.prompt) : null;

  if (fromPrompt !== null) {
    requestedRaw = fromPrompt;
    return {
      requestedRaw,
      requestedPickCount: clamp(fromPrompt, 1, MAX_ASSISTANT_SUGGESTIONS),
      cappedBySystem: fromPrompt > MAX_ASSISTANT_SUGGESTIONS
    };
  }

  const recentConversation = (input.conversation ?? []).slice(-3).map(message => message.content);
  for (const content of recentConversation.reverse()) {
    const parsed = parseRequestedCount(content);
    if (parsed !== null) {
      requestedRaw = parsed;
      return {
        requestedRaw,
        requestedPickCount: clamp(parsed, 1, MAX_ASSISTANT_SUGGESTIONS),
        cappedBySystem: parsed > MAX_ASSISTANT_SUGGESTIONS
      };
    }
  }

  return {
    requestedRaw,
    requestedPickCount: 5,
    cappedBySystem: false
  };
}

function isSuggestionCapacityQuestion(input: {
  prompt?: string;
  conversation?: Array<{ content: string }>;
}) {
  const combined = [input.prompt ?? "", ...(input.conversation ?? []).map(message => message.content)]
    .join(" \n ")
    .toLowerCase();

  return (
    /wie viele[^.!?\n]{0,40}(?:filme|serien|titel|vorschl[aä]ge)/.test(combined) ||
    /how many[^.!?\n]{0,40}(?:movies|series|titles|suggestions|picks)/.test(combined)
  );
}

function getRequestedSeasonCount(input: {
  prompt?: string;
  conversation?: Array<{ content: string }>;
}) {
  const combined = [input.prompt ?? "", ...(input.conversation ?? []).map(message => message.content)]
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
    /(?:tell\s+me\s+more\s+about|more\s+about|info\s+about|what\s+about)\s+["“”]?(.+?)["“”]?\s*[.!?]?$/i
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
            sanitizedBody.conversation = sanitizedBody.conversation.slice(-12);
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
        return containsPromptInjection([
          parsed.data.prompt,
          parsed.data.timeBudget,
          parsed.data.mood,
          ...(parsed.data.conversation ?? []).map(message => message.content),
          ...(parsed.data.referenceTitles ?? []).map(reference => reference.query)
        ]);
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

        return NextResponse.json({
          mode: "priority_groups",
          data: {
            ...data,
            groups
          }
        });
      }

      case "assistant": {
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

        const requestedSeasonCount = getRequestedSeasonCount({
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
          parsed.data.referenceTitles.map(reference => ensureResolvedMediaAllowed(reference, locale))
        );
        const references = explicitReferenceResults
          .filter(result => result.resolved)
          .map(result => result.resolved!.context);

        if (references.length < 3) {
          const inferredCandidates = [
            extractLikelyTitleQuery(parsed.data.prompt),
            ...parsed.data.conversation
              .slice(-2)
              .map(message => extractLikelyTitleQuery(message.content))
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

        const data = await askOpenRouterJson(
          assistantPrompt(
            {
              prompt: parsed.data.prompt,
              mediaType: parsed.data.mediaType,
              desiredPickCount: requestedPickCount,
              timeBudget: parsed.data.timeBudget,
              mood: parsed.data.mood,
              intensity: parsed.data.intensity,
              socialContext: parsed.data.socialContext,
              references,
              feedback: parsed.data.feedback,
              conversation: parsed.data.conversation
            },
            locale
          ),
          aiAssistantResponseSchema
        );
        const resolvedPicks = await resolveAllowedAIPicks(data.picks, locale);
        const picksAfterSeasonFilter = requestedSeasonCount
          ? await filterAIPicksBySeasonCount(
              resolvedPicks.filter(
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
          : resolvedPicks;
        const toppedUpPicks = await topUpAssistantPicks({
          picks: picksAfterSeasonFilter,
          requestedPickCount,
          mediaType: parsed.data.mediaType,
          animeIntent,
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
