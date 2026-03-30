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
    provider?: number;
  };
}) {
  const [mediaType, setMediaType] = useState(initial.mediaType);
  const [genre, setGenre] = useState<number | undefined>(initial.genre);
  const [yearFrom, setYearFrom] = useState<number | undefined>(initial.yearFrom);
  const [yearTo, setYearTo] = useState<number | undefined>(initial.yearTo);
  const [rating, setRating] = useState<number | undefined>(initial.rating);
  const [sort, setSort] = useState(initial.sort);
  const [region, setRegion] = useState(initial.region);
  const [provider, setProvider] = useState<number | undefined>(initial.provider);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { dictionary, locale } = useLanguage();
  const providerOptions = useProviderOptions(mediaType, region);

  useEffect(() => {
    setMediaType(initial.mediaType);
    setGenre(initial.genre);
    setYearFrom(initial.yearFrom);
    setYearTo(initial.yearTo);
    setRating(initial.rating);
    setSort(initial.sort);
    setRegion(initial.region);
    setProvider(initial.provider);
  }, [initial]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    if (!providerOptions.options.some(option => option.providerId === provider)) {
      setProvider(undefined);
    }
  }, [provider, providerOptions.options]);

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

  const apply = () => {
    const params = new URLSearchParams();
    params.set("mediaType", mediaType);
    params.set("sort", sort);
    params.set("page", "1");
    params.set("region", region);
    if (genre) params.set("genre", String(genre));
    if (yearFrom) params.set("yearFrom", String(yearFrom));
    if (yearTo) params.set("yearTo", String(yearTo));
    if (rating !== undefined) params.set("rating", String(rating));
    if (provider) params.set("provider", String(provider));

    savePreferredRegion(region);

    startTransition(() => {
      router.push(`/discover?${params.toString()}`);
    });
  };

  const numberFormatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        apply();
      }}
      className="space-y-4 rounded-[2rem] border border-border/50 bg-card/50 p-5"
    >
      <div className="flex flex-wrap gap-3">
        <select
          value={mediaType}
          onChange={event => {
            setMediaType(event.target.value as "movie" | "tv");
            setGenre(undefined);
          }}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="movie">{dictionary.discoverFilters.movies}</option>
          <option value="tv">{dictionary.discoverFilters.series}</option>
        </select>
        <select
          value={genre ?? ""}
          onChange={event =>
            setGenre(event.target.value ? Number(event.target.value) : undefined)
          }
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="">{dictionary.discoverFilters.allCategories}</option>
          {genres.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label={dictionary.discoverFilters.yearFrom}
          value={yearFrom ?? ""}
          onChange={event => setYearFrom(event.target.value ? Number(event.target.value) : undefined)}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="">{dictionary.discoverFilters.yearFrom}</option>
          {YEAR_OPTIONS.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        {yearFrom ? (
          <select
            aria-label={dictionary.discoverFilters.yearTo}
            value={yearTo ?? ""}
            onChange={event => setYearTo(event.target.value ? Number(event.target.value) : undefined)}
            className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
          >
            <option value="">{dictionary.discoverFilters.yearTo}</option>
            {yearToOptions.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        ) : null}
        <select
          aria-label={dictionary.discoverFilters.minRating}
          value={rating ?? ""}
          onChange={event => setRating(event.target.value ? Number(event.target.value) : undefined)}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="">{dictionary.discoverFilters.allRatings}</option>
          {RATING_OPTIONS.map(value => (
            <option key={value} value={value}>
              {`${dictionary.discoverFilters.minRating} ${numberFormatter.format(value)}`}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={event => setSort(event.target.value)}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="popularity.desc">{dictionary.discoverFilters.popularity}</option>
          <option value="vote_average.desc">{dictionary.discoverFilters.rating}</option>
          <option value="primary_release_date.desc">{dictionary.discoverFilters.newestMovies}</option>
          <option value="first_air_date.desc">{dictionary.discoverFilters.newestSeries}</option>
        </select>
        <select
          aria-label={dictionary.discoverFilters.country}
          value={region}
          onChange={event => setRegion(event.target.value)}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          {regions.map(option => (
            <option key={option.regionCode} value={option.regionCode}>
              {option.regionName}
            </option>
          ))}
        </select>
        <select
          aria-label={dictionary.discoverFilters.streamingService}
          value={provider ?? ""}
          onChange={event =>
            setProvider(event.target.value ? Number(event.target.value) : undefined)
          }
          disabled={providerOptions.isLoading}
          className="h-10 min-w-[13rem] rounded-xl border border-border/50 bg-background px-3 text-sm disabled:opacity-60"
        >
          <option value="">
            {providerOptions.isLoading
              ? dictionary.discoverFilters.loadingStreamingServices
              : providerOptions.error
                ? dictionary.discoverFilters.streamingServiceError
                : dictionary.discoverFilters.allStreamingServices}
          </option>
          {providerOptions.options.map(option => (
            <option key={option.providerId} value={option.providerId}>
              {option.providerName}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={isPending}>
          {dictionary.discoverFilters.apply}
        </Button>
      </div>
    </form>
  );
}
