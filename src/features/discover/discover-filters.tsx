"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import type { Genre } from "@/types/media";

export function DiscoverFilters({
  movieGenres,
  tvGenres,
  initial
}: {
  movieGenres: Genre[];
  tvGenres: Genre[];
  initial: {
    mediaType: "movie" | "tv";
    genre?: number;
    year?: number;
    rating?: number;
    page: number;
    sort: string;
  };
}) {
  const [mediaType, setMediaType] = useState(initial.mediaType);
  const [genre, setGenre] = useState<number | undefined>(initial.genre);
  const [year, setYear] = useState(initial.year?.toString() ?? "");
  const [rating, setRating] = useState(initial.rating?.toString() ?? "");
  const [sort, setSort] = useState(initial.sort);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { dictionary } = useLanguage();

  const genres = mediaType === "movie" ? movieGenres : tvGenres;

  const apply = () => {
    const params = new URLSearchParams();
    params.set("mediaType", mediaType);
    params.set("sort", sort);
    params.set("page", "1");
    if (genre) params.set("genre", String(genre));
    if (year) params.set("year", year);
    if (rating) params.set("rating", rating);

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
        <Button type="submit" disabled={isPending}>
          {dictionary.discoverFilters.apply}
        </Button>
      </div>
    </form>
  );
}
