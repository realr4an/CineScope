import "server-only";

import { getTmdbEnv, isTmdbConfigured } from "@/lib/env";
import type { Locale } from "@/lib/i18n/types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_REQUEST_TIMEOUT_MS = 12_000;

export function getTmdbLanguage(locale: Locale = "de") {
  return locale === "en" ? "en-US" : "de-DE";
}

export async function fetchTmdb<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  init?: RequestInit,
  locale: Locale = "de"
) {
  if (!isTmdbConfigured()) {
    throw new Error("TMDB_API_KEY oder TMDB_ACCESS_TOKEN fehlt.");
  }

  const env = getTmdbEnv();

  if (!env.success) {
    throw new Error(env.error.issues[0]?.message ?? "TMDB-Konfiguration ist ungültig.");
  }

  const searchParams = new URLSearchParams();
  searchParams.set("language", getTmdbLanguage(locale));

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const headers = new Headers(init?.headers);

  if (env.data.TMDB_ACCESS_TOKEN) {
    headers.set("Authorization", `Bearer ${env.data.TMDB_ACCESS_TOKEN}`);
  } else if (env.data.TMDB_API_KEY) {
    searchParams.set("api_key", env.data.TMDB_API_KEY);
  }

  const timeoutSignal = AbortSignal.timeout(TMDB_REQUEST_TIMEOUT_MS);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;

  let response: Response;

  try {
    response = await fetch(`${TMDB_BASE_URL}${path}?${searchParams.toString()}`, {
      ...init,
      headers,
      signal,
      next: { revalidate: 3600 }
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("TMDB request timeout");
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
