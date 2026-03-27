import type { NextApiRequest, NextApiResponse } from "next";
import type { ZodError } from "zod";

import { summarySchema } from "@/lib/ai/schemas";
import { generateSpoilerFreeSummary } from "@/lib/ai/summary";

function formatValidationError(
  error: ZodError<{
    title: string;
    mediaType: "movie" | "tv";
    overview: string;
    genres: string[];
    releaseDate?: string | null;
  }>
) {
  const flattened = error.flatten();
  const fieldMessages = Object.values(flattened.fieldErrors)
    .flat()
    .filter((message): message is string => Boolean(message));

  return fieldMessages[0] ?? flattened.formErrors[0] ?? "Ungültige Zusammenfassungsdaten.";
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const parsed = summarySchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ error: formatValidationError(parsed.error) });
  }

  try {
    const summary = await generateSpoilerFreeSummary(parsed.data);
    return response.status(200).json({ summary });
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : "Summary failed"
    });
  }
}
