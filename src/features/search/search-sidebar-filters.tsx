"use client";

import { useEffect, useMemo } from "react";
import { ChevronDown, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { useProviderOptions } from "@/features/watch-providers/use-provider-options";
import { STAR_RATING_BUCKETS } from "@/lib/media-rating";
import type { Genre } from "@/types/media";
import type { WatchRegion } from "@/types/watch-providers";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1949 },
  (_, index) => CURRENT_YEAR - index
);

export interface SearchDraftState {
  query: string;
  type: "all" | "movie" | "tv";
  sort: "popularity" | "rating" | "release_date";
  genre?: number;
  yearFrom?: number;
  yearTo?: number;
  rating?: number;
  ratings: number[];
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
  isPending
}: {
  movieGenres: Genre[];
  tvGenres: Genre[];
  availableRegions: WatchRegion[];
  value: SearchDraftState;
  onChange: (nextValue: SearchDraftState) => void;
  onReset: () => void;
  isPending: boolean;
}) {
  const { dictionary, locale } = useLanguage();
  const providerType = value.type === "all" ? "all" : value.type;
  const providerOptions = useProviderOptions(providerType, value.region);
  const text =
    locale === "en"
      ? {
          title: "Filters",
          description: "Adjust filters first. They only apply once you start a search.",
          mediaType: "Media type",
          sortBy: "Sort by",
          category: "Category",
          starRating: "Star rating",
          allStarRatings: "All star ratings",
          selected: "selected",
          range: "to",
          chooseTypeFirst: "Select a specific media type to filter by category.",
          clearStreaming: "Clear all",
          noStreamingOptions: "No streaming services are available for this selection.",
          reset: "Reset filters"
        }
      : {
          title: "Filter",
          description:
            "Passe die Filter zuerst an. Sie werden erst beim Klick auf Suchen angewendet.",
          mediaType: "Medientyp",
          sortBy: "Sortierung",
          category: "Kategorie",
          starRating: "Sternebewertung",
          allStarRatings: "Alle Sternbewertungen",
          selected: "ausgewählt",
          range: "bis",
          chooseTypeFirst: "Wähle erst Film oder Serie, um nach Kategorien zu filtern.",
          clearStreaming: "Alle entfernen",
          noStreamingOptions: "Für diese Auswahl sind keine Streamingdienste verfügbar.",
          reset: "Filter zurücksetzen"
        };

  useEffect(() => {
    if (!value.providers.length) {
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
  }, [onChange, providerOptions.options, value]);

  const genres = value.type === "movie" ? movieGenres : value.type === "tv" ? tvGenres : [];
  const yearToOptions = useMemo(
    () => YEAR_OPTIONS.filter(year => !value.yearFrom || year >= value.yearFrom),
    [value.yearFrom]
  );
  const numberFormatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  const selectedRatingLabel = value.ratings.length
    ? `${value.ratings.length} ${text.selected}`
    : text.allStarRatings;

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
          ] as const).map(([nextType, label]) => (
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
          ))}
        </div>
      </div>

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
        <div className="space-y-2">
          <label className="text-sm font-medium">{text.starRating}</label>
          <details className="group rounded-xl border border-border/50 bg-background">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="truncate">{selectedRatingLabel}</span>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-2 border-t border-border/50 px-3 py-3">
              {STAR_RATING_BUCKETS.map(bucket => {
                const checked = value.ratings.includes(bucket.value);
                const nextRatings = checked
                  ? value.ratings.filter(current => current !== bucket.value)
                  : [...value.ratings, bucket.value].sort((left, right) => right - left);

                return (
                  <label
                    key={bucket.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/50 bg-card/40 px-3 py-2 text-sm transition hover:border-primary/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onChange({
                          ...value,
                          ratings: nextRatings
                        })
                      }
                      className="size-4 rounded border-border"
                    />
                    <span className="flex min-w-[5.5rem] items-center gap-1 text-amber-400">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`size-3.5 ${
                            index < bucket.value
                              ? "fill-current text-amber-400"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      ))}
                    </span>
                    <span className="text-muted-foreground">
                      {numberFormatter.format(bucket.min)} {text.range}{" "}
                      {numberFormatter.format(bucket.max)}
                    </span>
                  </label>
                );
              })}
            </div>
          </details>
        </div>

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
                </label>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">{text.noStreamingOptions}</p>
          )}
        </div>
      </div>

      <Button type="button" variant="outline" onClick={onReset} disabled={isPending} className="w-full">
        {text.reset}
      </Button>
    </aside>
  );
}
