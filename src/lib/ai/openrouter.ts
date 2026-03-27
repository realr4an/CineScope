import { getOpenRouterEnv } from "@/lib/env";
import type { ZodType } from "zod";

function extractJsonPayload(input: string) {
  const match = input.match(/\{[\s\S]*\}/);
  return match?.[0] ?? input;
}

export async function askOpenRouter(prompt: string) {
  const env = getOpenRouterEnv();

  if (!env.success) {
    throw new Error(env.error.issues[0]?.message ?? "OPENROUTER_API_KEY fehlt.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.data.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.data.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content as string;
}

export async function askOpenRouterJson<T>(prompt: string, schema: ZodType<T>) {
  const raw = await askOpenRouter(prompt);
  return schema.parse(JSON.parse(extractJsonPayload(raw)));
}
