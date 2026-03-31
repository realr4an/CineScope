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
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1949 },
  (_, index) => CURRENT_YEAR - index
);
const RATING_OPTIONS = [9, 8, 7, 6, 5, 4, 3];

export function SearchSidebarFilters({
  query,
  movieGenres,
  tvGenres,
  availableRegions,
  initial
}: {
  query: string;
  movieGenres: Genre[];
  tvGenres: Genre[];
  availableRegions: WatchRegion[];
  initial: {
    type: "all" | "movie" | "tv";
    sort: "popularity" | "rating" | "release_date";
    genre?: number;
    yearFrom?: number;
    yearTo?: number;
    rating?: number;
    region: string;
    providers: number[];
  };
}) {
  const [type, setType] = useState(initial.type);
  const [sort, setSort] = useState(initial.sort);
  const [genre, setGenre] = useState<number | undefined>(initial.genre);
  const [yearFrom, setYearFrom] = useState<number | undefined>(initial.yearFrom);
  const [yearTo, setYearTo] = useState<number | undefined>(initial.yearTo);
  const [rating, setRating] = useState<number | undefined>(initial.rating);
  const [region, setRegion] = useState(initial.region);
  const [providers, setProviders] = useState<number[]>(initial.providers);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { dictionary, locale } = useLanguage();
  const providerType = type === "all" ? "all" : type;
  const providerOptions = useProviderOptions(providerType, region);
  const text =
    locale === "en"
      ? {
          title: "Filters",
          description: "Search with text or leave the field empty and browse with filters.",
          mediaType: "Media type",
          sortBy: "Sort by",
          category: "Category",
          chooseTypeFirst: "Select a specific media type to filter by category.",
          clearStreaming: "Clear all",
          noStreamingOptions: "No streaming services are available for this selection.",
          reset: "Reset filters"
        }
      : {
          title: "Filter",
          description:
            "Suche mit Text oder lasse das Feld leer und stöbere direkt über die Seitenfilter.",
          mediaType: "Medientyp",
          sortBy: "Sortierung",
          category: "Kategorie",
          chooseTypeFirst: "Wähle erst Film oder Serie, um nach Kategorien zu filtern.",
          clearStreaming: "Alle entfernen",
          noStreamingOptions: "Für diese Auswahl sind keine Streamingdienste verfügbar.",
          reset: "Filter zurücksetzen"
        };

  useEffect(() => {
    setType(initial.type);
    setSort(initial.sort);
    setGenre(initial.genre);
    setYearFrom(initial.yearFrom);
    setYearTo(initial.yearTo);
    setRating(initial.rating);
    setRegion(initial.region);
    setProviders(initial.providers);
  }, [initial]);

  useEffect(() => {
    if (!providers.length) {
      return;
    }

    const availableIds = new Set(providerOptions.options.map(option => option.providerId));
    setProviders(current => current.filter(providerId => availableIds.has(providerId)));
  }, [providerOptions.options, providers.length]);

  useEffect(() => {
    if (type === "all" && genre !== undefined) {
      setGenre(undefined);
    }
  }, [genre, type]);

  useEffect(() => {
    if (!yearFrom) {
      setYearTo(undefined);
      return;
    }

    if (yearTo && yearTo < yearFrom) {
      setYearTo(yearFrom);
    }
  }, [yearFrom, yearTo]);

  const genres = type === "movie" ? movieGenres : type === "tv" ? tvGenres : [];
  const yearToOptions = useMemo(
    () => YEAR_OPTIONS.filter(year => !yearFrom || year <= yearFrom),
    [yearFrom]
  );
  const numberFormatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  const apply = (
    overrides?: Partial<typeof initial> & {
      providers?: number[];
      genre?: number | undefined;
      yearFrom?: number | undefined;
      yearTo?: number | undefined;
      rating?: number | undefined;
    }
  ) => {
    const resolvedType = overrides?.type ?? type;
    const resolvedSort = overrides?.sort ?? sort;
    const resolvedGenre = resolvedType === "all" ? undefined : overrides?.genre ?? genre;
    const resolvedYearFrom = overrides?.yearFrom ?? yearFrom;
    const resolvedYearTo = overrides?.yearTo ?? yearTo;
    const resolvedRating = overrides?.rating ?? rating;
    const resolvedRegion = overrides?.region ?? region;
    const resolvedProviders = overrides?.providers ?? providers;
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    params.set("type", resolvedType);
    params.set("sort", resolvedSort);
    params.set("page", "1");
    params.set("region", resolvedRegion);
    if (resolvedGenre) {
      params.set("genre", String(resolvedGenre));
    }
    if (resolvedYearFrom) {
      params.set("yearFrom", String(resolvedYearFrom));
    }
    if (resolvedYearTo) {
      params.set("yearTo", String(resolvedYearTo));
    }
    if (resolvedRating !== undefined) {
      params.set("rating", String(resolvedRating));
    }
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
      genre: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      rating: undefined,
      region,
      providers: [] as number[]
    };

    setType(nextState.type);
    setSort(nextState.sort);
    setGenre(undefined);
    setYearFrom(undefined);
    setYearTo(undefined);
    setRating(undefined);
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
                const nextGenre = value === "all" ? undefined : genre;
                setType(value);
                if (value === "all") {
                  setGenre(undefined);
                }
                setProviders([]);
                apply({ type: value, genre: nextGenre, providers: [] });
              }}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                type === value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/50 bg-background hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="search-category-filter">
          {text.category}
        </label>
        <select
          id="search-category-filter"
          value={genre ?? ""}
          onChange={event => {
            const nextGenre = event.target.value ? Number(event.target.value) : undefined;
            setGenre(nextGenre);
            apply({ genre: nextGenre });
          }}
          className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
          disabled={type === "all"}
        >
          <option value="">
            {type === "all" ? text.chooseTypeFirst : dictionary.discoverFilters.allCategories}
          </option>
          {genres.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="search-year-from-filter">
          {dictionary.discoverFilters.yearFrom}
        </label>
        <select
          id="search-year-from-filter"
          value={yearFrom ?? ""}
          onChange={event => {
            const nextYearFrom = event.target.value ? Number(event.target.value) : undefined;
            setYearFrom(nextYearFrom);
            apply({ yearFrom: nextYearFrom, yearTo: yearTo && nextYearFrom && yearTo < nextYearFrom ? nextYearFrom : yearTo });
          }}
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
            onChange={event => {
              const nextYearTo = event.target.value ? Number(event.target.value) : undefined;
              setYearTo(nextYearTo);
              apply({ yearTo: nextYearTo });
            }}
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
        <label className="text-sm font-medium" htmlFor="search-rating-filter">
          {dictionary.discoverFilters.minRating}
        </label>
        <select
          id="search-rating-filter"
          value={rating ?? ""}
          onChange={event => {
            const nextRating = event.target.value ? Number(event.target.value) : undefined;
            setRating(nextRating);
            apply({ rating: nextRating });
          }}
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
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                sort === value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/50 bg-background hover:border-primary/40"
              }`}
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
            <p className="text-sm text-destructive">
              {dictionary.searchForm.streamingServiceError}
            </p>
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

      <Button
        type="button"
        variant="outline"
        onClick={resetFilters}
        disabled={isPending}
        className="w-full"
      >
        {text.reset}
      </Button>
    </aside>
  );
}
