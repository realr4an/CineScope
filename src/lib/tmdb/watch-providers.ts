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

function mapProvider(provider: TmdbWatchProvider): ProviderItem {
  return {
    providerId: provider.provider_id,
    providerName: provider.provider_name,
    logoPath: provider.logo_path,
    displayPriority: provider.display_priority
  };
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

  return [...seen.values()].sort((left, right) => {
    const leftPriority = left.displayPriority ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = right.displayPriority ?? Number.MAX_SAFE_INTEGER;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.providerName.localeCompare(right.providerName, "de");
  });
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

  return sortProviders(response.results);
}

export async function getTvProviderOptions(regionCode: string) {
  const normalizedRegion = normalizeWatchRegionCode(regionCode) ?? "DE";
  const response = await fetchTmdb<TmdbWatchProviderListResponse>("/watch/providers/tv", {
    watch_region: normalizedRegion,
    language: "en-US"
  });

  return sortProviders(response.results);
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
>(items: T[], regionCode: string, providerId: number) {
  const normalizedRegion = normalizeWatchRegionCode(regionCode) ?? "DE";

  const checks = await Promise.all(
    items.map(async item => {
      try {
        const rawResponse =
          item.mediaType === "movie"
            ? await getMovieWatchProviders(item.tmdbId)
            : await getTvWatchProviders(item.tmdbId);
        const providers = getRegionProviders(rawResponse, normalizedRegion);

        return {
          item,
          matches: providers.some(provider => provider.provider_id === providerId)
        };
      } catch {
        return { item, matches: false };
      }
    })
  );

  return checks.filter(result => result.matches).map(result => result.item);
}
