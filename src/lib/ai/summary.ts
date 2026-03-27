import { askOpenRouter } from "@/lib/ai/openrouter";
import { spoilerFreeSummaryPrompt } from "@/lib/ai/prompts";

export async function generateSpoilerFreeSummary(input: {
  title: string;
  mediaType: "movie" | "tv";
  overview: string;
  genres: string[];
  releaseDate?: string | null;
}) {
  return askOpenRouter(spoilerFreeSummaryPrompt(input));
}
