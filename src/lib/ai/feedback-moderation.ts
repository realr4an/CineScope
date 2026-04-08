import { z } from "zod";

import { askOpenRouterJsonWithOptions } from "@/lib/ai/openrouter";

const FEEDBACK_MODERATION_MODEL = "openai/gpt-4o-mini";

const feedbackModerationSchema = z.object({
  isConstructive: z.boolean(),
  summary: z.string().min(1),
  reason: z.string().min(1)
});

function createFallbackSummary(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "No feedback content provided.";
  }

  return normalized.length <= 220 ? normalized : `${normalized.slice(0, 217)}...`;
}

export async function moderateFeedback(input: {
  category: string;
  message: string;
}) {
  const prompt = `
You classify product feedback for a movie and series web app.

Your task is only this:
1. decide whether the feedback is constructive for product work
2. write a short admin-safe summary
3. give a short reason

Important:
- Do not reject or moderate for storage.
- The feedback will be stored anyway.
- "Constructive" means actionable product feedback, bug report, clear criticism, concrete suggestion, UX/content issue, or a specific request.
- "Not constructive" means vague chatter, pure greetings, spam-like filler, or messages with no usable product action.
- Links to pages inside the app are normal and should not count against constructiveness.
- Content feedback about misleading tags, wrong framing, missing warnings, historical context, or missing labels counts as constructive.

Respond as strict JSON with:
- isConstructive: boolean
- summary: short string
- reason: short string

Category: ${input.category}
Message:
${input.message}
`.trim();

  try {
    const result = await askOpenRouterJsonWithOptions(prompt, feedbackModerationSchema, {
      temperature: 0.1,
      maxTokens: 220,
      model: FEEDBACK_MODERATION_MODEL
    });

    return {
      aiChecked: true,
      isConstructive: result.isConstructive,
      summary: result.summary,
      reason: result.reason,
      aiModel: FEEDBACK_MODERATION_MODEL
    };
  } catch {
    return {
      aiChecked: false,
      isConstructive: null,
      summary: createFallbackSummary(input.message),
      reason: "AI feedback classification unavailable.",
      aiModel: FEEDBACK_MODERATION_MODEL
    };
  }
}
