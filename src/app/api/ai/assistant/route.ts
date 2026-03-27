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

async function ensureResolvedMediaAllowed(input: {
  query: string;
  mediaType?: "all" | "movie" | "tv";
}) {
  const resolved = await resolveMediaAIContext(input);

  if (!resolved) {
    return {
      resolved: null,
      error: "Der Titel konnte nicht sicher aufgelÖst werden.",
      status: 404
    };
  }

  const access = await getAgeAccessForMedia(resolved.context.mediaType, resolved.context.tmdbId);

  if (!access.allowed) {
    return {
      resolved: null,
      error: "Dieser Titel ist fÜr das hinterlegte Alter nicht verfÜgbar.",
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
  const body = await request.json().catch(() => null);
  const parsed = aiActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    switch (parsed.data.mode) {
      case "compare": {
        const [leftResult, rightResult] = await Promise.all([
          ensureResolvedMediaAllowed(parsed.data.left),
          ensureResolvedMediaAllowed(parsed.data.right)
        ]);

        if (!leftResult.resolved || !rightResult.resolved) {
          return NextResponse.json(
            {
              error:
                leftResult.error ??
                rightResult.error ??
                "Mindestens einer der Titel konnte nicht sicher aufgelÖst werden."
            },
            { status: leftResult.status !== 200 ? leftResult.status : rightResult.status }
          );
        }

        const left = leftResult.resolved;
        const right = rightResult.resolved;

        const data = await askOpenRouterJson(
          comparePrompt(left.context, right.context),
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
        const result = await ensureResolvedMediaAllowed(parsed.data.title);

        if (!result.resolved) {
          return NextResponse.json(
            { error: result.error ?? "Der Titel konnte nicht sicher aufgelÖst werden." },
            { status: result.status }
          );
        }

        const resolved = result.resolved;

        const data = await askOpenRouterJson(
          fitPrompt({
            title: resolved.context,
            feedback: parsed.data.feedback,
            userPrompt: parsed.data.userPrompt
          }),
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
          priorityPrompt({
            titles,
            context: parsed.data.context
          }),
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
            parsed.data.referenceTitles.map(reference => ensureResolvedMediaAllowed(reference))
          )
        )
          .filter(result => result.resolved)
          .map(result => result.resolved!.context);

        const data = await askOpenRouterJson(
          assistantPrompt({
            prompt: parsed.data.prompt,
            mediaType: parsed.data.mediaType,
            timeBudget: parsed.data.timeBudget,
            mood: parsed.data.mood,
            intensity: parsed.data.intensity,
            socialContext: parsed.data.socialContext,
            references,
            feedback: parsed.data.feedback
          }),
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
        const result = await ensureResolvedMediaAllowed(parsed.data.title);

        if (!result.resolved) {
          return NextResponse.json(
            { error: result.error ?? "Der Titel konnte nicht sicher aufgelÖst werden." },
            { status: result.status }
          );
        }

        const resolved = result.resolved;

        const data = await askOpenRouterJson(
          titleInsightsPrompt(resolved.context),
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
          personInsightsPrompt(person),
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
        error: error instanceof Error ? error.message : "AI action failed"
      },
      { status: 500 }
    );
  }
}
