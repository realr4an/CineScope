import "server-only";

import { unstable_cache } from "next/cache";

import { askOpenRouterJson } from "@/lib/ai/openrouter";
import { searchQueryInterpretationPrompt } from "@/lib/ai/prompts";
import { aiSearchInterpretationSchema } from "@/lib/ai/schemas";
import { isOpenRouterConfigured } from "@/lib/env";
import { containsPromptInjection } from "@/lib/security/prompt-injection";

const SEARCH_QUERY_CACHE_SECONDS = 60 * 60 * 24 * 30;

function normalizeQueryText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dedupeQueries(queries: string[], originalQuery: string) {
  const originalNormalized = normalizeQueryText(originalQuery).toLowerCase();
  const seen = new Set<string>();

  return queries
    .map(normalizeQueryText)
    .filter(query => query.length > 0)
    .filter(query => {
      const key = query.toLowerCase();

      if (key === originalNormalized || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function buildLocalVariants(query: string) {
  const normalized = normalizeQueryText(query);
  const variants = [
    normalized.replace(/[“”"'`´]/g, ""),
    normalized.replace(/[^\p{L}\p{N}\s:&-]/gu, " "),
    normalized.replace(/\s+/g, " ")
  ];

  return dedupeQueries(variants, query);
}

async function getAIQueryVariants(query: string, mediaType: "all" | "movie" | "tv") {
  if (!isOpenRouterConfigured()) {
    return [] as string[];
  }

  if (containsPromptInjection([query])) {
    return [] as string[];
  }

  try {
    const data = await unstable_cache(
      async () =>
        askOpenRouterJson(
          searchQueryInterpretationPrompt({ query, mediaType }),
          aiSearchInterpretationSchema
        ),
      [`ai-search-query-${mediaType}-${query.toLowerCase()}`],
      { revalidate: SEARCH_QUERY_CACHE_SECONDS }
    )();

    return dedupeQueries([data.normalizedQuery, ...data.alternatives], query);
  } catch {
    return [] as string[];
  }
}

export async function getSearchFallbackQueries(input: {
  query: string;
  mediaType: "all" | "movie" | "tv";
}) {
  const localVariants = buildLocalVariants(input.query);
  const aiVariants = await getAIQueryVariants(input.query, input.mediaType);

  return dedupeQueries([...localVariants, ...aiVariants], input.query).slice(0, 4);
}
