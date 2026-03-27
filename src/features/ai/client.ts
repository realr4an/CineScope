"use client";

async function readError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  return payload?.error ?? fallback;
}

export async function postAIAction<T>(body: unknown, fallbackMessage: string) {
  const response = await fetch("/api/ai/assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await readError(response, fallbackMessage));
  }

  return (await response.json()) as T;
}
