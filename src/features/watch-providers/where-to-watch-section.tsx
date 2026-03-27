"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Globe, RefreshCcw, Tv2 } from "lucide-react";

import { SectionHeader } from "@/components/shared/ui-components";
import { EmptyState, ErrorState } from "@/components/states/state-components";
import { Button } from "@/components/ui/button";
import { tmdbImageUrl } from "@/lib/tmdb/images";
import { cn } from "@/lib/utils";
import type { MediaType } from "@/types/media";
import type {
  ProviderItem,
  WatchProviderGroupKey,
  WatchRegion,
  WhereToWatchResult
} from "@/types/watch-providers";
import { useRegionPreference } from "@/features/watch-providers/region-preference";

const GROUP_LABELS: Record<WatchProviderGroupKey, string> = {
  flatrate: "Im Abo",
  free: "Kostenlos",
  ads: "Mit Werbung",
  rent: "Leihen",
  buy: "Kaufen"
};

const GROUP_ORDER: WatchProviderGroupKey[] = ["flatrate", "free", "ads", "rent", "buy"];

function WhereToWatchSkeleton() {
  return (
    <section className="space-y-4">
      <SectionHeader
        title="Where to watch"
        subtitle="Streaming-, Kauf- und Leihoptionen für dein Land"
      />
      <div className="rounded-[2rem] border border-border/50 bg-card/50 p-5">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="skeleton-shimmer h-10 w-40 rounded-xl" />
          <div className="skeleton-shimmer h-10 w-52 rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-border/40 bg-background/50 p-4">
              <div className="skeleton-shimmer mb-4 h-5 w-28 rounded-full" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 2 }).map((__, providerIndex) => (
                  <div
                    key={providerIndex}
                    className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/70 p-3"
                  >
                    <div className="skeleton-shimmer size-12 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="skeleton-shimmer h-4 w-4/5 rounded-full" />
                      <div className="skeleton-shimmer h-3 w-2/3 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProviderCard({ provider }: { provider: ProviderItem }) {
  const logoUrl = tmdbImageUrl(provider.logoPath, "w185");

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/70 p-3">
      {logoUrl ? (
        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/90 p-1.5">
          <img
            src={logoUrl}
            alt={provider.providerName}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-semibold text-muted-foreground">
          {provider.providerName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{provider.providerName}</div>
        <div className="text-xs text-muted-foreground">TMDB Provider</div>
      </div>
    </div>
  );
}

function ProviderGroup({
  title,
  providers
}: {
  title: string;
  providers: ProviderItem[];
}) {
  if (!providers.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-background/50 p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map(provider => (
          <ProviderCard key={provider.providerId} provider={provider} />
        ))}
      </div>
    </div>
  );
}

function hasAnyProviders(result: WhereToWatchResult) {
  return GROUP_ORDER.some(group => result[group].length > 0);
}

async function getJson<T>(input: RequestInfo | URL) {
  const response = await fetch(input, {
    cache: "no-store"
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request fehlgeschlagen.");
  }

  return data as T;
}

export function WhereToWatchSection({
  mediaType,
  tmdbId
}: {
  mediaType: MediaType;
  tmdbId: number;
}) {
  const [regions, setRegions] = useState<WatchRegion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [result, setResult] = useState<WhereToWatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { regionCode, isReady, setRegionCode } = useRegionPreference(regions);

  const selectedRegion = useMemo(
    () => regions.find(region => region.regionCode === regionCode) ?? null,
    [regionCode, regions]
  );

  const loadRegions = useCallback(async () => {
    setRegionsLoading(true);
    setError(null);

    try {
      const data = await getJson<{ regions: WatchRegion[] }>("/api/watch-providers/regions");

      if (!data.regions.length) {
        throw new Error("TMDB hat keine verfügbaren Regionen zurückgegeben.");
      }

      setRegions(data.regions);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Verfügbare Länder konnten nicht geladen werden."
      );
    } finally {
      setRegionsLoading(false);
    }
  }, []);

  const loadProviders = useCallback(
    async (nextRegionCode: string) => {
      setProvidersLoading(true);
      setError(null);

      try {
        const data = await getJson<WhereToWatchResult>(
          `/api/watch-providers/${mediaType}/${tmdbId}?region=${nextRegionCode}`
        );

        setResult(data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Watch-Provider konnten nicht geladen werden."
        );
      } finally {
        setProvidersLoading(false);
      }
    },
    [mediaType, tmdbId]
  );

  useEffect(() => {
    void loadRegions();
  }, [loadRegions]);

  useEffect(() => {
    if (!isReady || !regionCode) {
      return;
    }

    void loadProviders(regionCode);
  }, [isReady, loadProviders, regionCode]);

  const handleRetry = () => {
    if (!regions.length) {
      void loadRegions();
      return;
    }

    void loadProviders(regionCode);
  };

  if (regionsLoading || (!isReady && !error) || (providersLoading && !result)) {
    return <WhereToWatchSkeleton />;
  }

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Where to watch"
        subtitle="Streaming-, Kauf- und Leihoptionen für das ausgewählte Land"
      />

      <div className="rounded-[2rem] border border-border/50 bg-card/50 p-5">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Globe className="size-3.5" />
              Aktives Land: {selectedRegion?.regionName ?? regionCode}
            </div>
            <p className="text-sm text-muted-foreground">
              Die Verfügbarkeit variiert je Land und wird direkt über TMDB Watch Providers geladen.
            </p>
          </div>

          {regions.length ? (
            <label className="block w-full max-w-sm space-y-2 lg:w-auto">
              <span className="text-sm font-medium">Land auswählen</span>
              <select
                value={regionCode}
                onChange={event => setRegionCode(event.target.value)}
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/30 sm:min-w-[16rem] lg:w-auto"
              >
                {regions.map(region => (
                  <option key={region.regionCode} value={region.regionCode}>
                    {region.regionName}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {error ? (
          <ErrorState
            title="Watch-Provider konnten nicht geladen werden"
            description={error}
            action={{
              label: "Erneut versuchen",
              onClick: handleRetry
            }}
            className="px-4 py-12"
          />
        ) : null}

        {!error && providersLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/40 bg-background/50 p-4"
              >
                <div className="skeleton-shimmer mb-4 h-5 w-28 rounded-full" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 2 }).map((__, providerIndex) => (
                    <div
                      key={providerIndex}
                      className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/70 p-3"
                    >
                      <div className="skeleton-shimmer size-12 rounded-xl" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="skeleton-shimmer h-4 w-4/5 rounded-full" />
                        <div className="skeleton-shimmer h-3 w-2/3 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!error && !providersLoading && result && !hasAnyProviders(result) ? (
          <EmptyState
            title="Keine Watch-Provider gefunden"
            description="Für dieses Land sind aktuell keine Streaming-, Kauf- oder Leihoptionen in TMDB hinterlegt."
            className="px-4 py-12"
          />
        ) : null}

        {!error && !providersLoading && result && hasAnyProviders(result) ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1 text-xs text-muted-foreground">
                <Tv2 className="size-3.5" />
                {selectedRegion?.regionName ?? result.regionName}
              </div>
              {result.link ? (
                <Button asChild variant="outline" size="sm">
                  <a href={result.link} target="_blank" rel="noreferrer">
                    TMDB Anbieter-Seite
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              ) : null}
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <RefreshCcw className="size-4" />
                Aktualisieren
              </button>
            </div>

            <div
              className={cn(
                "grid gap-4",
                GROUP_ORDER.filter(group => result[group].length > 0).length > 1
                  ? "md:grid-cols-2"
                  : "grid-cols-1"
              )}
            >
              {GROUP_ORDER.map(group => (
                <ProviderGroup
                  key={group}
                  title={GROUP_LABELS[group]}
                  providers={result[group]}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

