"use client";

type ErrorPayload =
  | {
      error?:
        | string
        | {
            formErrors?: string[];
            fieldErrors?: Record<string, string[] | undefined>;
          };
    }
  | null;

function normalizeError(payload: ErrorPayload, fallback: string) {
  if (!payload?.error) {
    return fallback;
  }

  if (typeof payload.error === "string") {
    const trimmed = payload.error.trim();

    if (!trimmed) {
      return fallback;
    }

    const looksTechnical =
      trimmed.startsWith("[") ||
      trimmed.startsWith("{") ||
      /zod|schema|validation|stack|openrouter request failed|unexpected token|json/i.test(trimmed);

    if (looksTechnical) {
      return fallback;
    }

    return trimmed;
  }

  const firstFormError = payload.error.formErrors?.find(Boolean);
  if (firstFormError) {
    return firstFormError;
  }

  const firstFieldError = Object.values(payload.error.fieldErrors ?? {})
    .flat()
    .find(Boolean);

  return firstFieldError ?? fallback;
}

async function readError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as ErrorPayload;
  return normalizeError(payload, fallback);
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
