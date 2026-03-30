"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SearchField } from "@/components/shared/ui-components";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import { useProviderOptions } from "@/features/watch-providers/use-provider-options";
import type { WatchRegion } from "@/types/watch-providers";

export function SearchForm({
  initialQuery,
  initialType,
  initialSort,
  initialRegion,
  initialProvider,
  availableRegions
}: {
  initialQuery: string;
  initialType: "all" | "movie" | "tv";
  initialSort: "popularity" | "rating" | "release_date";
  initialRegion: string;
  initialProvider?: number;
  availableRegions: WatchRegion[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState(initialType);
  const [sort, setSort] = useState(initialSort);
  const [region, setRegion] = useState(initialRegion);
  const [provider, setProvider] = useState<number | undefined>(initialProvider);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { dictionary } = useLanguage();
  const providerOptions = useProviderOptions(type, region);

  useEffect(() => {
    setQuery(initialQuery);
    setType(initialType);
    setSort(initialSort);
    setRegion(initialRegion);
    setProvider(initialProvider);
  }, [initialProvider, initialQuery, initialRegion, initialSort, initialType]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    if (!providerOptions.options.some(option => option.providerId === provider)) {
      setProvider(undefined);
    }
  }, [provider, providerOptions.options]);

  const submit = () => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    params.set("type", type);
    params.set("sort", sort);
    params.set("page", "1");
    params.set("region", region);
    if (provider) {
      params.set("provider", String(provider));
    }

    savePreferredRegion(region);

    const target = `/search?${params.toString()}`;
    const currentSearch = searchParams?.toString() ?? "";
    const current = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;

    startTransition(() => {
      if (current === target) {
        router.refresh();
        return;
      }

      router.push(target);
    });
  };

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
      className="space-y-4 rounded-[2rem] border border-border/50 bg-card/50 p-5"
    >
      <SearchField
        value={query}
        onChange={setQuery}
        onClear={() => setQuery("")}
        className="max-w-3xl"
        placeholder={dictionary.searchForm.searchPlaceholder}
      />
      <div className="flex flex-wrap gap-3">
        <select
          value={type}
          onChange={event => setType(event.target.value as "all" | "movie" | "tv")}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="all">{dictionary.searchForm.all}</option>
          <option value="movie">{dictionary.searchForm.movies}</option>
          <option value="tv">{dictionary.searchForm.series}</option>
        </select>
        <select
          value={sort}
          onChange={event =>
            setSort(event.target.value as "popularity" | "rating" | "release_date")
          }
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="popularity">{dictionary.searchForm.popularity}</option>
          <option value="rating">{dictionary.searchForm.rating}</option>
          <option value="release_date">{dictionary.searchForm.releaseDate}</option>
        </select>
        <select
          aria-label={dictionary.searchForm.country}
          value={region}
          onChange={event => setRegion(event.target.value)}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          {availableRegions.map(option => (
            <option key={option.regionCode} value={option.regionCode}>
              {option.regionName}
            </option>
          ))}
        </select>
        <select
          aria-label={dictionary.searchForm.streamingService}
          value={provider ?? ""}
          onChange={event =>
            setProvider(event.target.value ? Number(event.target.value) : undefined)
          }
          disabled={providerOptions.isLoading}
          className="h-10 min-w-[13rem] rounded-xl border border-border/50 bg-background px-3 text-sm disabled:opacity-60"
        >
          <option value="">
            {providerOptions.isLoading
              ? dictionary.searchForm.loadingStreamingServices
              : providerOptions.error
                ? dictionary.searchForm.streamingServiceError
                : dictionary.searchForm.allStreamingServices}
          </option>
          {providerOptions.options.map(option => (
            <option key={option.providerId} value={option.providerId}>
              {option.providerName}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={isPending}>
          {dictionary.searchForm.search}
        </Button>
      </div>
    </form>
  );
}
