import { fetchTmdb } from "@/lib/tmdb/client";
import {
  getWatchRegionDisplayName,
  normalizeWatchRegionCode
} from "@/lib/tmdb/watch-provider-preference";
import type {
  TmdbAvailableRegionsResponse,
  TmdbWatchProvider,
  TmdbWatchProviderListResponse,
  TmdbWatchProvidersResponse
} from "@/lib/tmdb/types";
import type { MediaType } from "@/types/media";
import type {
  ProviderItem,
  WatchProviderGroupKey,
  WatchRegion,
  WhereToWatchResult
} from "@/types/watch-providers";

const WATCH_PROVIDER_GROUPS: WatchProviderGroupKey[] = ["flatrate", "free", "ads", "rent", "buy"];
const SEARCH_PROVIDER_BATCH_SIZE = 10;
const SEARCH_PROVIDER_MAX_CHECKS = 30;
const SEARCH_PROVIDER_TARGET_MATCHES = 18;
const watchProviderResponseCache = new Map<string, Promise<TmdbWatchProvidersResponse>>();

function mapProvider(provider: TmdbWatchProvider): ProviderItem {
  return {
    providerId: provider.provider_id,
    providerName: provider.provider_name,
    logoPath: provider.logo_path,
    displayPriority: provider.display_priority
  };
}

function sortProviderItemsAlphabetically<T extends { providerName: string }>(providers: T[]) {
  return [...providers].sort((left, right) =>
    left.providerName.localeCompare(right.providerName, "de", { sensitivity: "base" })
  );
}

function sortProviders(providers: TmdbWatchProvider[] | undefined) {
  return [...(providers ?? [])]
    .sort((left, right) => {
      const leftPriority = left.display_priority ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = right.display_priority ?? Number.MAX_SAFE_INTEGER;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return left.provider_name.localeCompare(right.provider_name, "de");
    })
    .map(mapProvider);
}

function mapProviderOptionsAlphabetically(providers: TmdbWatchProvider[] | undefined) {
  return sortProviderItemsAlphabetically([...(providers ?? [])].map(mapProvider));
}

function dedupeProviders(providers: ProviderItem[]) {
  const seen = new Map<number, ProviderItem>();

  for (const provider of providers) {
    const existing = seen.get(provider.providerId);

    if (!existing) {
      seen.set(provider.providerId, provider);
      continue;
    }

    const existingPriority = existing.displayPriority ?? Number.MAX_SAFE_INTEGER;
    const nextPriority = provider.displayPriority ?? Number.MAX_SAFE_INTEGER;

    if (nextPriority < existingPriority) {
      seen.set(provider.providerId, provider);
    }
  }

  return sortProviderItemsAlphabetically([...seen.values()]);
}

function getRegionProviders(
  rawResponse: TmdbWatchProvidersResponse,
  regionCode: string
): TmdbWatchProvider[] {
  const normalizedRegion = normalizeWatchRegionCode(regionCode) ?? regionCode.toUpperCase();
  const providersForRegion = rawResponse.results[normalizedRegion];

  if (!providersForRegion) {
    return [];
  }

  return WATCH_PROVIDER_GROUPS.flatMap(group => providersForRegion[group] ?? []);
}

function getCachedWatchProviders(mediaType: MediaType, tmdbId: number) {
  const cacheKey = `${mediaType}-${tmdbId}`;
  const cached = watchProviderResponseCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const request = mediaType === "movie" ? getMovieWatchProviders(tmdbId) : getTvWatchProviders(tmdbId);
  watchProviderResponseCache.set(cacheKey, request);
  return request;
}

export async function getAvailableRegions(): Promise<WatchRegion[]> {
  const response = await fetchTmdb<TmdbAvailableRegionsResponse>("/watch/providers/regions", {
    language: "en-US"
  });

  return response.results
    .map(region => ({
      regionCode: region.iso_3166_1,
      regionName: getWatchRegionDisplayName(region.iso_3166_1)
    }))
    .sort((left, right) => left.regionName.localeCompare(right.regionName, "de"));
}

export async function getMovieWatchProviders(movieId: number) {
  return fetchTmdb<TmdbWatchProvidersResponse>(`/movie/${movieId}/watch/providers`, {
    language: "en-US"
  });
}

export async function getTvWatchProviders(tvId: number) {
  return fetchTmdb<TmdbWatchProvidersResponse>(`/tv/${tvId}/watch/providers`, {
    language: "en-US"
  });
}

export async function getMovieProviderOptions(regionCode: string) {
  const normalizedRegion = normalizeWatchRegionCode(regionCode) ?? "DE";
  const response = await fetchTmdb<TmdbWatchProviderListResponse>("/watch/providers/movie", {
    watch_region: normalizedRegion,
    language: "en-US"
  });

  return mapProviderOptionsAlphabetically(response.results);
}

export async function getTvProviderOptions(regionCode: string) {
  const normalizedRegion = normalizeWatchRegionCode(regionCode) ?? "DE";
  const response = await fetchTmdb<TmdbWatchProviderListResponse>("/watch/providers/tv", {
    watch_region: normalizedRegion,
    language: "en-US"
  });

  return mapProviderOptionsAlphabetically(response.results);
}

export async function getProviderOptions(
  mediaType: MediaType | "all",
  regionCode: string
): Promise<ProviderItem[]> {
  if (mediaType === "movie") {
    return getMovieProviderOptions(regionCode);
  }

  if (mediaType === "tv") {
    return getTvProviderOptions(regionCode);
  }

  const [movieProviders, tvProviders] = await Promise.all([
    getMovieProviderOptions(regionCode),
    getTvProviderOptions(regionCode)
  ]);

  return dedupeProviders([...movieProviders, ...tvProviders]);
}

export function mapWatchProvidersForRegion(
  rawResponse: TmdbWatchProvidersResponse,
  regionCode: string
): WhereToWatchResult {
  const normalizedRegion = normalizeWatchRegionCode(regionCode) ?? regionCode.toUpperCase();
  const providersForRegion = rawResponse.results[normalizedRegion];

  const baseResult: WhereToWatchResult = {
    regionCode: normalizedRegion,
    regionName: getWatchRegionDisplayName(normalizedRegion),
    link: providersForRegion?.link,
    flatrate: [],
    free: [],
    ads: [],
    rent: [],
    buy: []
  };

  if (!providersForRegion) {
    return baseResult;
  }

  for (const group of WATCH_PROVIDER_GROUPS) {
    baseResult[group] = sortProviders(providersForRegion[group]);
  }

  return baseResult;
}

export async function filterMediaByWatchProvider<
  T extends {
    tmdbId: number;
    mediaType: MediaType;
  }
>(items: T[], regionCode: string, providerIds: number[]) {
  const normalizedRegion = normalizeWatchRegionCode(regionCode) ?? "DE";
  const limitedItems = items.slice(0, SEARCH_PROVIDER_MAX_CHECKS);
  const providerSet = new Set(providerIds);
  const matches: T[] = [];

  if (!providerSet.size) {
    return items;
  }

  for (let index = 0; index < limitedItems.length; index += SEARCH_PROVIDER_BATCH_SIZE) {
    const batch = limitedItems.slice(index, index + SEARCH_PROVIDER_BATCH_SIZE);
    const checks = await Promise.all(
      batch.map(async item => {
        try {
          const rawResponse = await getCachedWatchProviders(item.mediaType, item.tmdbId);
          const providers = getRegionProviders(rawResponse, normalizedRegion);

          return {
            item,
            matches: providers.some(provider => providerSet.has(provider.provider_id))
          };
        } catch {
          return { item, matches: false };
        }
      })
    );

    matches.push(...checks.filter(result => result.matches).map(result => result.item));

    if (matches.length >= SEARCH_PROVIDER_TARGET_MATCHES) {
      break;
    }
  }

  return matches;
}
