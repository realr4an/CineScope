import type { Locale } from "@/lib/i18n/types";

import { askOpenRouter } from "@/lib/ai/openrouter";
import { spoilerFreeSummaryPrompt } from "@/lib/ai/prompts";

export async function generateSpoilerFreeSummary(
  input: {
    title: string;
    mediaType: "movie" | "tv";
    overview: string;
    genres: string[];
    releaseDate?: string | null;
  },
  locale: Locale = "de"
) {
  return askOpenRouter(spoilerFreeSummaryPrompt(input, locale));
}
