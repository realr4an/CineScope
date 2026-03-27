import { NextResponse } from "next/server";

import { getAgeAccessForMedia } from "@/lib/age-gate/server";
import {
  getManyMediaAIContexts,
  getPersonAIContext,
  resolveMediaAIContext
} from "@/lib/ai/context";
import { resolveAIPicks, resolveAllowedAIPicks } from "@/lib/ai/formatters";
import { askOpenRouterJson } from "@/lib/ai/openrouter";
import {
  assistantPrompt,
  comparePrompt,
  fitPrompt,
  personInsightsPrompt,
  priorityPrompt,
  titleInsightsPrompt
} from "@/lib/ai/prompts";
import {
  aiActionSchema,
  aiAssistantResponseSchema,
  aiCompareResponseSchema,
  aiFitResponseSchema,
  aiPersonInsightsResponseSchema,
  aiPriorityResponseSchema,
  aiTitleInsightsResponseSchema
} from "@/lib/ai/schemas";
import { getLocaleFromCookieHeader } from "@/lib/i18n/request";
import type { Locale } from "@/lib/i18n/types";

function getText(locale: Locale) {
  return locale === "en"
    ? {
        unresolved: "The title could not be resolved reliably.",
        blocked: "This title is not available for the stored age.",
        unresolvedOne: "At least one of the titles could not be resolved reliably.",
        invalidInput: "The AI request is invalid.",
        aiActionFailed: "AI action failed"
      }
    : {
        unresolved: "Der Titel konnte nicht sicher aufgelöst werden.",
        blocked: "Dieser Titel ist für das hinterlegte Alter nicht verfügbar.",
        unresolvedOne: "Mindestens einer der Titel konnte nicht sicher aufgelöst werden.",
        invalidInput: "Die KI-Anfrage ist ungültig.",
        aiActionFailed: "KI-Aktion fehlgeschlagen"
      };
}

function formatValidationError(
  fieldErrors: Record<string, string[] | undefined>,
  formErrors: string[],
  fallback: string
) {
  const firstFormError = formErrors.find(Boolean);
  if (firstFormError) {
    return firstFormError;
  }

  const firstFieldError = Object.values(fieldErrors).flat().find(Boolean);
  return firstFieldError ?? fallback;
}

async function ensureResolvedMediaAllowed(
  input: {
    query: string;
    mediaType?: "all" | "movie" | "tv";
  },
  locale: Locale
) {
  const text = getText(locale);
  const resolved = await resolveMediaAIContext(input);

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
  const locale = getLocaleFromCookieHeader(request.headers.get("cookie"));
  const text = getText(locale);
  const body = await request.json().catch(() => null);
  const parsed = aiActionSchema.safeParse(body);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return NextResponse.json(
      { error: formatValidationError(flattened.fieldErrors, flattened.formErrors, text.invalidInput) },
      { status: 400 }
    );
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
        const titles = await getManyMediaAIContexts(parsed.data.items);
        const data = await askOpenRouterJson(
          priorityPrompt(
            {
              titles,
              context: parsed.data.context
            },
            locale
          ),
          aiPriorityResponseSchema
        );
        const order = await resolveAIPicks(data.order);

        return NextResponse.json({
          mode: "priority",
          data: {
            ...data,
            order
          }
        });
      }

      case "assistant": {
        const references = (
          await Promise.all(
            parsed.data.referenceTitles.map(reference => ensureResolvedMediaAllowed(reference, locale))
          )
        )
          .filter(result => result.resolved)
          .map(result => result.resolved!.context);

        const data = await askOpenRouterJson(
          assistantPrompt(
            {
              prompt: parsed.data.prompt,
              mediaType: parsed.data.mediaType,
              timeBudget: parsed.data.timeBudget,
              mood: parsed.data.mood,
              intensity: parsed.data.intensity,
              socialContext: parsed.data.socialContext,
              references,
              feedback: parsed.data.feedback
            },
            locale
          ),
          aiAssistantResponseSchema
        );
        const picks = await resolveAllowedAIPicks(data.picks);

        return NextResponse.json({
          mode: "assistant",
          data: {
            ...data,
            picks
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
        const person = await getPersonAIContext(parsed.data.personId);
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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : text.aiActionFailed
      },
      { status: 500 }
    );
  }
}
