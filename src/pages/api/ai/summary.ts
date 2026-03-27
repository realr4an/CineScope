import type { NextApiRequest, NextApiResponse } from "next";
import type { ZodError } from "zod";

import { summarySchema } from "@/lib/ai/schemas";
import { generateSpoilerFreeSummary } from "@/lib/ai/summary";
import { normalizeLocale } from "@/lib/i18n/request";
import { LANGUAGE_COOKIE } from "@/lib/i18n/types";

function formatValidationError(
  error: ZodError<{
    title: string;
    mediaType: "movie" | "tv";
    overview: string;
    genres: string[];
    releaseDate?: string | null;
  }>,
  locale: "de" | "en"
) {
  const flattened = error.flatten();
  const fieldMessages = Object.values(flattened.fieldErrors)
    .flat()
    .filter((message): message is string => Boolean(message));

  return (
    fieldMessages[0] ??
    flattened.formErrors[0] ??
    (locale === "en" ? "Invalid summary input." : "Ungültige Zusammenfassungsdaten.")
  );
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const locale = normalizeLocale(request.cookies[LANGUAGE_COOKIE]);
  const text =
    locale === "en"
      ? {
          methodNotAllowed: "Method not allowed",
          fallbackError: "Summary failed"
        }
      : {
          methodNotAllowed: "Methode nicht erlaubt",
          fallbackError: "Zusammenfassung fehlgeschlagen"
        };

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: text.methodNotAllowed });
  }

  const parsed = summarySchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ error: formatValidationError(parsed.error, locale) });
  }

  try {
    const summary = await generateSpoilerFreeSummary(parsed.data, locale);
    return response.status(200).json({ summary });
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : text.fallbackError
    });
  }
}
