"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import { useProviderOptions } from "@/features/watch-providers/use-provider-options";
import type { WatchRegion } from "@/types/watch-providers";

export function SearchSidebarFilters({
  query,
  availableRegions,
  initial
}: {
  query: string;
  availableRegions: WatchRegion[];
  initial: {
    type: "all" | "movie" | "tv";
    sort: "popularity" | "rating" | "release_date";
    region: string;
    providers: number[];
  };
}) {
  const [type, setType] = useState(initial.type);
  const [sort, setSort] = useState(initial.sort);
  const [region, setRegion] = useState(initial.region);
  const [providers, setProviders] = useState<number[]>(initial.providers);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { dictionary, locale } = useLanguage();
  const providerOptions = useProviderOptions(type, region);
  const text =
    locale === "en"
      ? {
          title: "Filters",
          description: "Refine the current view with extra filters.",
          mediaType: "Media type",
          sortBy: "Sort by",
          clearStreaming: "Clear all",
          noStreamingOptions: "No streaming services are available for this selection.",
          reset: "Reset filters"
        }
      : {
          title: "Filter",
          description: "Verfeinere die aktuelle Ansicht mit zusätzlichen Filtern.",
          mediaType: "Medientyp",
          sortBy: "Sortierung",
          clearStreaming: "Alle entfernen",
          noStreamingOptions: "Für diese Auswahl sind keine Streamingdienste verfügbar.",
          reset: "Filter zurücksetzen"
        };

  useEffect(() => {
    setType(initial.type);
    setSort(initial.sort);
    setRegion(initial.region);
    setProviders(initial.providers);
  }, [initial]);

  useEffect(() => {
    if (!providers.length) {
      return;
    }

    const availableIds = new Set(providerOptions.options.map(option => option.providerId));
    setProviders(current => current.filter(providerId => availableIds.has(providerId)));
  }, [providerOptions.options]);

  const apply = (nextState?: Partial<typeof initial> & { providers?: number[] }) => {
    const resolvedType = nextState?.type ?? type;
    const resolvedSort = nextState?.sort ?? sort;
    const resolvedRegion = nextState?.region ?? region;
    const resolvedProviders = nextState?.providers ?? providers;
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    params.set("type", resolvedType);
    params.set("sort", resolvedSort);
    params.set("page", "1");
    params.set("region", resolvedRegion);
    for (const providerId of resolvedProviders) {
      params.append("providers", String(providerId));
    }

    savePreferredRegion(resolvedRegion);

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  const toggleProvider = (providerId: number) => {
    const nextProviders = providers.includes(providerId)
      ? providers.filter(id => id !== providerId)
      : [...providers, providerId];
    setProviders(nextProviders);
    apply({ providers: nextProviders });
  };

  const resetFilters = () => {
    const nextState = {
      type: "all" as const,
      sort: "popularity" as const,
      region,
      providers: [] as number[]
    };
    setType(nextState.type);
    setSort(nextState.sort);
    setProviders([]);
    apply(nextState);
  };

  return (
    <aside className="space-y-5 rounded-[2rem] border border-border/50 bg-card/50 p-5 lg:sticky lg:top-24">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{text.title}</h2>
        <p className="text-sm text-muted-foreground">{text.description}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{text.mediaType}</p>
        <div className="grid gap-2">
          {([
            ["all", dictionary.searchForm.all],
            ["movie", dictionary.searchForm.movies],
            ["tv", dictionary.searchForm.series]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setType(value);
                apply({ type: value, providers: [] });
                setProviders([]);
              }}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${type === value ? "border-primary bg-primary/10 text-foreground" : "border-border/50 bg-background hover:border-primary/40"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{text.sortBy}</p>
        <div className="grid gap-2">
          {([
            ["popularity", dictionary.searchForm.popularity],
            ["rating", dictionary.searchForm.rating],
            ["release_date", dictionary.searchForm.releaseDate]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSort(value);
                apply({ sort: value });
              }}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${sort === value ? "border-primary bg-primary/10 text-foreground" : "border-border/50 bg-background hover:border-primary/40"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="search-region-filter">
          {dictionary.searchForm.country}
        </label>
        <select
          id="search-region-filter"
          value={region}
          onChange={event => {
            const nextRegion = event.target.value;
            setRegion(nextRegion);
            setProviders([]);
            apply({ region: nextRegion, providers: [] });
          }}
          className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          {availableRegions.map(option => (
            <option key={option.regionCode} value={option.regionCode}>
              {option.regionName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{dictionary.searchForm.streamingService}</p>
          {providers.length ? (
            <button
              type="button"
              onClick={() => {
                setProviders([]);
                apply({ providers: [] });
              }}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {text.clearStreaming}
            </button>
          ) : null}
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {providerOptions.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {dictionary.searchForm.loadingStreamingServices}
            </p>
          ) : providerOptions.error ? (
            <p className="text-sm text-destructive">{dictionary.searchForm.streamingServiceError}</p>
          ) : providerOptions.options.length ? (
            providerOptions.options.map(option => {
              const checked = providers.includes(option.providerId);

              return (
                <label
                  key={option.providerId}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm transition hover:border-primary/40"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProvider(option.providerId)}
                    className="size-4 rounded border-border"
                  />
                  <span className="min-w-0 truncate">{option.providerName}</span>
                </label>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">{text.noStreamingOptions}</p>
          )}
        </div>
      </div>

      <Button type="button" variant="outline" onClick={resetFilters} disabled={isPending} className="w-full">
        {text.reset}
      </Button>
    </aside>
  );
}
