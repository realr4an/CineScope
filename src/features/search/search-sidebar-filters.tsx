"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { useProviderOptions } from "@/features/watch-providers/use-provider-options";
import type { Genre } from "@/types/media";
import type { WatchRegion } from "@/types/watch-providers";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1949 },
  (_, index) => CURRENT_YEAR - index
);

export type SearchSortKey = "popularity" | "rating" | "release_date";
export type SearchSortDirection = "asc" | "desc";

export interface SearchDraftState {
  query: string;
  type: "all" | "movie" | "tv";
  sort: SearchSortKey;
  direction: SearchSortDirection;
  genre?: number;
  yearFrom?: number;
  yearTo?: number;
  rating?: number;
  region: string;
  providers: number[];
}

export function SearchSidebarFilters({
  movieGenres,
  tvGenres,
  availableRegions,
  value,
  onChange,
  onReset,
  isPending,
  typeOptions = ["all", "movie", "tv"],
  primaryAction,
  hideCategoryFilter = false,
  hideMediaTypeFilter = false
}: {
  movieGenres: Genre[];
  tvGenres: Genre[];
  availableRegions: WatchRegion[];
  value: SearchDraftState;
  onChange: (nextValue: SearchDraftState) => void;
  onReset: () => void;
  isPending: boolean;
  typeOptions?: Array<"all" | "movie" | "tv">;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  hideCategoryFilter?: boolean;
  hideMediaTypeFilter?: boolean;
}) {
  const { dictionary, locale } = useLanguage();
  const [providerSearchQuery, setProviderSearchQuery] = useState("");
  const providerType = value.type === "all" ? "all" : value.type;
  const providerOptions = useProviderOptions(providerType, value.region);
  const text =
    locale === "en"
      ? {
          title: "Filters",
          description: "Adjust filters first. They only apply once you start a search.",
          mediaType: "Media type",
          sortBy: "Sort by",
          sortDirection: "Direction",
          category: "Genre",
          ascending: "Ascending",
          descending: "Descending",
          chooseTypeFirst: "Select media type first",
          clearStreaming: "Clear all",
          providerSearchPlaceholder: "Search streaming services...",
          selectedStreaming: "Selected services",
          noStreamingMatch: "No service matches your search.",
          noStreamingOptions: "No streaming services are available for this selection.",
          reset: "Reset filters"
        }
      : {
          title: "Filter",
          description:
            "Passe die Filter zuerst an. Sie werden erst beim Klick auf Suchen angewendet.",
          mediaType: "Medientyp",
          sortBy: "Sortierung",
          sortDirection: "Richtung",
          category: "Genre",
          ascending: "Aufsteigend",
          descending: "Absteigend",
          chooseTypeFirst: "Erst Medientyp wählen",
          clearStreaming: "Alle entfernen",
          providerSearchPlaceholder: "Streamingdienste suchen...",
          selectedStreaming: "Ausgewählte Dienste",
          noStreamingMatch: "Kein Dienst passt zu deiner Suche.",
          noStreamingOptions: "Für diese Auswahl sind keine Streamingdienste verfügbar.",
          reset: "Filter zurücksetzen"
        };
  const pendingText =
    locale === "en" ? "Applying filters and loading..." : "Filter werden angewendet und geladen...";

  useEffect(() => {
    if (!value.providers.length || providerOptions.isLoading || providerOptions.error) {
      return;
    }

    const availableIds = new Set(providerOptions.options.map(option => option.providerId));
    const filteredProviders = value.providers.filter(providerId => availableIds.has(providerId));

    if (filteredProviders.length !== value.providers.length) {
      onChange({
        ...value,
        providers: filteredProviders
      });
    }
  }, [onChange, providerOptions.error, providerOptions.isLoading, providerOptions.options, value]);

  useEffect(() => {
    setProviderSearchQuery("");
  }, [providerType, value.region]);

  const genres = value.type === "movie" ? movieGenres : value.type === "tv" ? tvGenres : [];
  const yearToOptions = useMemo(
    () => YEAR_OPTIONS.filter(year => !value.yearFrom || year >= value.yearFrom),
    [value.yearFrom]
  );
  const numberFormatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  const normalizedProviderQuery = providerSearchQuery.trim().toLocaleLowerCase();
  const selectedProviders = useMemo(() => {
    const selectedIds = new Set(value.providers);

    return providerOptions.options
      .filter(option => selectedIds.has(option.providerId))
      .sort((left, right) =>
        left.providerName.localeCompare(right.providerName, locale === "en" ? "en" : "de")
      );
  }, [locale, providerOptions.options, value.providers]);
  const sortedProviderOptions = useMemo(() => {
    const filtered = providerOptions.options.filter(option =>
      normalizedProviderQuery.length
        ? option.providerName.toLocaleLowerCase().includes(normalizedProviderQuery)
        : true
    );

    return [...filtered].sort((left, right) => {
      const leftSelected = value.providers.includes(left.providerId);
      const rightSelected = value.providers.includes(right.providerId);

      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }

      return left.providerName.localeCompare(right.providerName, locale === "en" ? "en" : "de");
    });
  }, [locale, normalizedProviderQuery, providerOptions.options, value.providers]);

  return (
    <aside className="min-w-0 w-full space-y-5 overflow-hidden rounded-[2rem] border border-border/50 bg-card/50 p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{text.title}</h2>
        <p className="text-sm text-muted-foreground">{text.description}</p>
        {isPending ? (
          <div
            className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-3.5 animate-spin" />
            <span>{pendingText}</span>
          </div>
        ) : null}
      </div>

      {!hideMediaTypeFilter ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">{text.mediaType}</p>
          <div className="grid gap-2">
            {typeOptions.map(nextType => {
              const label =
                nextType === "all"
                  ? dictionary.searchForm.all
                  : nextType === "movie"
                    ? dictionary.searchForm.movies
                    : dictionary.searchForm.series;

              return (
                <button
                  key={nextType}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      type: nextType,
                      genre: nextType === "all" ? undefined : value.genre,
                      providers: []
                    })
                  }
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    value.type === nextType
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/50 bg-background hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {!hideCategoryFilter ? (
        <div className="space-y-3">
          <label className="text-sm font-medium" htmlFor="search-category-filter">
            {text.category}
          </label>
          <select
            id="search-category-filter"
            value={value.genre ?? ""}
            onChange={event =>
              onChange({
                ...value,
                genre: event.target.value ? Number(event.target.value) : undefined
              })
            }
            className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
            disabled={value.type === "all"}
          >
            <option value="">
              {value.type === "all" ? text.chooseTypeFirst : dictionary.discoverFilters.allCategories}
            </option>
            {genres.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="search-year-from-filter">
          {dictionary.discoverFilters.yearFrom}
        </label>
        <select
          id="search-year-from-filter"
          value={value.yearFrom ?? ""}
          onChange={event => {
            const nextYearFrom = event.target.value ? Number(event.target.value) : undefined;
            onChange({
              ...value,
              yearFrom: nextYearFrom,
              yearTo:
                !nextYearFrom || !value.yearTo
                  ? undefined
                  : value.yearTo < nextYearFrom
                    ? nextYearFrom
                    : value.yearTo
            });
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

        {value.yearFrom ? (
          <select
            value={value.yearTo ?? ""}
            onChange={event =>
              onChange({
                ...value,
                yearTo: event.target.value ? Number(event.target.value) : undefined
              })
            }
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
          value={value.rating ?? ""}
          onChange={event =>
            onChange({
              ...value,
              rating: event.target.value ? Number(event.target.value) : undefined
            })
          }
          className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="">{dictionary.discoverFilters.allRatings}</option>
          {[9, 8, 7, 6, 5, 4, 3].map(minimumValue => (
            <option key={minimumValue} value={minimumValue}>
              {`${dictionary.discoverFilters.minRating} ${numberFormatter.format(minimumValue)}`}
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
          ] as const).map(([nextSort, label]) => (
            <button
              key={nextSort}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  sort: nextSort
                })
              }
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                value.sort === nextSort
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/50 bg-background hover:border-primary/40"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{text.sortDirection}</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["desc", text.descending],
              ["asc", text.ascending]
            ] as const).map(([nextDirection, label]) => (
              <button
                key={nextDirection}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    direction: nextDirection
                  })
                }
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  value.direction === nextDirection
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/50 bg-background hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium" htmlFor="search-region-filter">
          {dictionary.searchForm.country}
        </label>
        <select
          id="search-region-filter"
          value={value.region}
          onChange={event =>
            onChange({
              ...value,
              region: event.target.value,
              providers: []
            })
          }
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
          {value.providers.length ? (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  providers: []
                })
              }
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {text.clearStreaming}
            </button>
          ) : null}
        </div>

        {selectedProviders.length ? (
          <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/10 p-3">
            <p className="text-xs font-medium text-primary">{text.selectedStreaming}</p>
            <div className="flex flex-wrap gap-2">
              {selectedProviders.map(option => (
                <button
                  key={option.providerId}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      providers: value.providers.filter(current => current !== option.providerId)
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background/80 px-2.5 py-1 text-xs text-foreground hover:border-primary"
                >
                  <Check className="size-3 text-primary" />
                  <span>{option.providerName}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <input
          type="text"
          value={providerSearchQuery}
          onChange={event => setProviderSearchQuery(event.target.value)}
          placeholder={text.providerSearchPlaceholder}
          className="h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm"
        />

        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {providerOptions.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {dictionary.searchForm.loadingStreamingServices}
            </p>
          ) : providerOptions.error ? (
            <p className="text-sm text-destructive">
              {dictionary.searchForm.streamingServiceError}
            </p>
          ) : sortedProviderOptions.length ? (
            sortedProviderOptions.map(option => {
              const checked = value.providers.includes(option.providerId);
              const nextProviders = checked
                ? value.providers.filter(current => current !== option.providerId)
                : [...value.providers, option.providerId];

              return (
                <label
                  key={option.providerId}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm transition hover:border-primary/40"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      onChange({
                        ...value,
                        providers: nextProviders
                      })
                    }
                    className="size-4 rounded border-border"
                  />
                  <span className="min-w-0 truncate">{option.providerName}</span>
                  {checked ? <Check className="ml-auto size-3.5 text-primary" /> : null}
                </label>
              );
            })
          ) : providerOptions.options.length ? (
            <p className="text-sm text-muted-foreground">{text.noStreamingMatch}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{text.noStreamingOptions}</p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        {primaryAction ? (
          <Button type="button" onClick={primaryAction.onClick} disabled={isPending} className="w-full">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {primaryAction.label}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onReset} disabled={isPending} className="w-full">
          {text.reset}
        </Button>
      </div>
    </aside>
  );
}
