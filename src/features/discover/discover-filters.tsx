"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import { useProviderOptions } from "@/features/watch-providers/use-provider-options";
import type { Genre } from "@/types/media";
import type { WatchRegion } from "@/types/watch-providers";

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
    year?: number;
    rating?: number;
    page: number;
    sort: string;
    region: string;
    provider?: number;
  };
}) {
  const [mediaType, setMediaType] = useState(initial.mediaType);
  const [genre, setGenre] = useState<number | undefined>(initial.genre);
  const [year, setYear] = useState(initial.year?.toString() ?? "");
  const [rating, setRating] = useState(initial.rating?.toString() ?? "");
  const [sort, setSort] = useState(initial.sort);
  const [region, setRegion] = useState(initial.region);
  const [provider, setProvider] = useState<number | undefined>(initial.provider);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { dictionary } = useLanguage();
  const providerOptions = useProviderOptions(mediaType, region);

  useEffect(() => {
    setMediaType(initial.mediaType);
    setGenre(initial.genre);
    setYear(initial.year?.toString() ?? "");
    setRating(initial.rating?.toString() ?? "");
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

  const genres = mediaType === "movie" ? movieGenres : tvGenres;

  const apply = () => {
    const params = new URLSearchParams();
    params.set("mediaType", mediaType);
    params.set("sort", sort);
    params.set("page", "1");
    params.set("region", region);
    if (genre) params.set("genre", String(genre));
    if (year) params.set("year", year);
    if (rating) params.set("rating", rating);
    if (provider) params.set("provider", String(provider));

    savePreferredRegion(region);

    startTransition(() => {
      router.push(`/discover?${params.toString()}`);
    });
  };

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
        <input
          value={year}
          onChange={event => setYear(event.target.value)}
          placeholder={dictionary.discoverFilters.year}
          className="h-10 w-28 rounded-xl border border-border/50 bg-background px-3 text-sm"
        />
        <input
          value={rating}
          onChange={event => setRating(event.target.value)}
          placeholder={dictionary.discoverFilters.minRating}
          className="h-10 w-32 rounded-xl border border-border/50 bg-background px-3 text-sm"
        />
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
