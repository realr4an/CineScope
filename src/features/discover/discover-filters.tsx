"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import { useProviderOptions } from "@/features/watch-providers/use-provider-options";
import type { Genre } from "@/types/media";
import type { WatchRegion } from "@/types/watch-providers";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, index) => CURRENT_YEAR - index);
const RATING_OPTIONS = [9, 8, 7, 6, 5, 4, 3];

export function DiscoverFilters({
  movieGenres,
  tvGenres,
  regions,
  initial
}: {
  movieGenres: Genre[];
  tvGenres: Genre[];
  regions: WatchRegion[];
  initial: {
    mediaType: "movie" | "tv";
    genre?: number;
    yearFrom?: number;
    yearTo?: number;
    rating?: number;
    page: number;
    sort: string;
    region: string;
    providers: number[];
  };
}) {
  const [mediaType, setMediaType] = useState(initial.mediaType);
  const [genre, setGenre] = useState<number | undefined>(initial.genre);
  const [yearFrom, setYearFrom] = useState<number | undefined>(initial.yearFrom);
  const [yearTo, setYearTo] = useState<number | undefined>(initial.yearTo);
  const [rating, setRating] = useState<number | undefined>(initial.rating);
  const [sort, setSort] = useState(initial.sort);
  const [region, setRegion] = useState(initial.region);
  const [providers, setProviders] = useState<number[]>(initial.providers);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { dictionary, locale } = useLanguage();
  const providerOptions = useProviderOptions(mediaType, region);
  const text =
    locale === "en"
      ? {
          title: "Filters",
          description: "Narrow categories by time range, rating, country and streaming services.",
          reset: "Reset filters",
          clearStreaming: "Clear all",
          noStreamingOptions: "No streaming services are available for this selection."
        }
      : {
          title: "Filter",
          description: "Grenze Kategorien nach Zeitraum, Bewertung, Land und Streamingdiensten ein.",
          reset: "Filter zurücksetzen",
          clearStreaming: "Alle entfernen",
          noStreamingOptions: "Für diese Auswahl sind keine Streamingdienste verfügbar."
        };
  const sortText =
    locale === "en"
      ? { sortBy: "Sort by" }
      : { sortBy: "Sortierung" };
  const mediaTypeText =
    locale === "en"
      ? { label: "Media type" }
      : { label: "Medientyp" };

  useEffect(() => {
    setMediaType(initial.mediaType);
    setGenre(initial.genre);
    setYearFrom(initial.yearFrom);
    setYearTo(initial.yearTo);
    setRating(initial.rating);
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

  useEffect(() => {
    if (!yearFrom) {
      setYearTo(undefined);
      return;
    }

    if (yearTo && yearTo < yearFrom) {
      setYearTo(yearFrom);
    }
  }, [yearFrom, yearTo]);

  const genres = mediaType === "movie" ? movieGenres : tvGenres;
  const yearToOptions = useMemo(
    () => YEAR_OPTIONS.filter(year => !yearFrom || year <= yearFrom),
    [yearFrom]
  );
  const numberFormatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  const apply = (overrides?: Partial<typeof initial> & { providers?: number[] }) => {
    const resolvedMediaType = overrides?.mediaType ?? mediaType;
    const resolvedGenre = overrides?.genre ?? genre;
    const resolvedYearFrom = overrides?.yearFrom ?? yearFrom;
    const resolvedYearTo = overrides?.yearTo ?? yearTo;
    const resolvedRating = overrides?.rating ?? rating;
    const resolvedSort = overrides?.sort ?? sort;
    const resolvedRegion = overrides?.region ?? region;
    const resolvedProviders = overrides?.providers ?? providers;
    const params = new URLSearchParams();

    params.set("mediaType", resolvedMediaType);
    params.set("sort", resolvedSort);
    params.set("page", "1");
    params.set("region", resolvedRegion);
    if (resolvedGenre) params.set("genre", String(resolvedGenre));
    if (resolvedYearFrom) params.set("yearFrom", String(resolvedYearFrom));
    if (resolvedYearTo) params.set("yearTo", String(resolvedYearTo));
    if (resolvedRating !== undefined) params.set("rating", String(resolvedRating));
    for (const providerId of resolvedProviders) {
      params.append("providers", String(providerId));
    }

    savePreferredRegion(resolvedRegion);

    startTransition(() => {
      router.push(`/discover?${params.toString()}`);
    });
  };

  const toggleProvider = (providerId: number) => {
    const nextProviders = providers.includes(providerId)
      ? providers.filter(id => id !== providerId)
      : [...providers, providerId];
    setProviders(nextProviders);
  };

  const resetFilters = () => {
    setGenre(undefined);
    setYearFrom(undefined);
    setYearTo(undefined);
    setRating(undefined);
    setSort("popularity.desc");
    setProviders([]);
    apply({
      genre: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      rating: undefined,
      sort: "popularity.desc",
      providers: []
    });
  };

  return (
    <aside className="space-y-5 rounded-[2rem] border border-border/50 bg-card/50 p-5 lg:sticky lg:top-24">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{text.title}</h2>
        <p className="text-sm text-muted-foreground">{text.description}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{mediaTypeText.label}</p>
        <div className="grid gap-2">
          {([
            ["movie", dictionary.discoverFilters.movies],
            ["tv", dictionary.discoverFilters.series]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMediaType(value);
                setGenre(undefined);
                setProviders([]);
                apply({ mediaType: value, genre: undefined, providers: [] });
              }}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${mediaType === value ? "border-primary bg-primary/10 text-foreground" : "border-border/50 bg-background hover:border-primary/40"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="discover-genre-filter">
          {dictionary.discoverFilters.allCategories}
        </label>
        <select
          id="discover-genre-filter"
          value={genre ?? ""}
          onChange={event => setGenre(event.target.value ? Number(event.target.value) : undefined)}
          className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="">{dictionary.discoverFilters.allCategories}</option>
          {genres.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="discover-year-from-filter">
          {dictionary.discoverFilters.yearFrom}
        </label>
        <select
          id="discover-year-from-filter"
          value={yearFrom ?? ""}
          onChange={event => setYearFrom(event.target.value ? Number(event.target.value) : undefined)}
          className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="">{dictionary.discoverFilters.anyYear}</option>
          {YEAR_OPTIONS.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        {yearFrom ? (
          <select
            value={yearTo ?? ""}
            onChange={event => setYearTo(event.target.value ? Number(event.target.value) : undefined)}
            className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
          >
            <option value="">{dictionary.discoverFilters.yearTo}</option>
            {yearToOptions.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="discover-rating-filter">
          {dictionary.discoverFilters.minRating}
        </label>
        <select
          id="discover-rating-filter"
          value={rating ?? ""}
          onChange={event => setRating(event.target.value ? Number(event.target.value) : undefined)}
          className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="">{dictionary.discoverFilters.allRatings}</option>
          {RATING_OPTIONS.map(value => (
            <option key={value} value={value}>
              {`${dictionary.discoverFilters.minRating} ${numberFormatter.format(value)}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">{sortText.sortBy}</p>
        <div className="grid gap-2">
          {([
            ["popularity.desc", dictionary.discoverFilters.popularity],
            ["vote_average.desc", dictionary.discoverFilters.rating],
            ["primary_release_date.desc", dictionary.discoverFilters.newestMovies],
            ["first_air_date.desc", dictionary.discoverFilters.newestSeries]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${sort === value ? "border-primary bg-primary/10 text-foreground" : "border-border/50 bg-background hover:border-primary/40"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="discover-region-filter">
          {dictionary.discoverFilters.country}
        </label>
        <select
          id="discover-region-filter"
          value={region}
          onChange={event => {
            const nextRegion = event.target.value;
            setRegion(nextRegion);
            setProviders([]);
          }}
          className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          {regions.map(option => (
            <option key={option.regionCode} value={option.regionCode}>
              {option.regionName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{dictionary.discoverFilters.streamingService}</p>
          {providers.length ? (
            <button
              type="button"
              onClick={() => setProviders([])}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {text.clearStreaming}
            </button>
          ) : null}
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {providerOptions.isLoading ? (
            <p className="text-sm text-muted-foreground">{dictionary.discoverFilters.loadingStreamingServices}</p>
          ) : providerOptions.error ? (
            <p className="text-sm text-destructive">{dictionary.discoverFilters.streamingServiceError}</p>
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

      <div className="grid gap-3">
        <Button type="button" onClick={() => apply()} disabled={isPending}>
          {dictionary.discoverFilters.apply}
        </Button>
        <Button type="button" variant="outline" onClick={resetFilters} disabled={isPending}>
          {text.reset}
        </Button>
      </div>
    </aside>
  );
}
