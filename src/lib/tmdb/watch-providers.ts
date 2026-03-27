import { fetchTmdb } from "@/lib/tmdb/client";
import type {
  TmdbAvailableRegionsResponse,
  TmdbWatchProvider,
  TmdbWatchProvidersResponse
} from "@/lib/tmdb/types";
import type {
  ProviderItem,
  WatchProviderGroupKey,
  WatchRegion,
  WhereToWatchResult
} from "@/types/watch-providers";

const WATCH_PROVIDER_GROUPS: WatchProviderGroupKey[] = [
  "flatrate",
  "free",
  "ads",
  "rent",
  "buy"
];

function getRegionDisplayName(regionCode: string) {
  try {
    const displayNames = new Intl.DisplayNames(["de-DE", "en"], {
      type: "region"
    });
    return displayNames.of(regionCode) ?? regionCode;
  } catch {
    return regionCode;
  }
}

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

export async function getAvailableRegions(): Promise<WatchRegion[]> {
  const response = await fetchTmdb<TmdbAvailableRegionsResponse>("/watch/providers/regions", {
    language: "en-US"
  });

  return response.results
    .map(region => ({
      regionCode: region.iso_3166_1,
      regionName: getRegionDisplayName(region.iso_3166_1)
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

export function mapWatchProvidersForRegion(
  rawResponse: TmdbWatchProvidersResponse,
  regionCode: string
): WhereToWatchResult {
  const normalizedRegion = regionCode.toUpperCase();
  const providersForRegion = rawResponse.results[normalizedRegion];

  const baseResult: WhereToWatchResult = {
    regionCode: normalizedRegion,
    regionName: getRegionDisplayName(normalizedRegion),
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
