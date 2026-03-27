export interface ProviderItem {
  providerId: number;
  providerName: string;
  logoPath: string | null;
  displayPriority: number | null;
}

export interface WatchRegion {
  regionCode: string;
  regionName: string;
}

export interface WhereToWatchResult {
  regionCode: string;
  regionName: string;
  link?: string;
  flatrate: ProviderItem[];
  free: ProviderItem[];
  ads: ProviderItem[];
  rent: ProviderItem[];
  buy: ProviderItem[];
}

export type WatchProviderGroupKey = keyof Pick<
  WhereToWatchResult,
  "flatrate" | "free" | "ads" | "rent" | "buy"
>;
