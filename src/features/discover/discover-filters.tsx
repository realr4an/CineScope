"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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

  const genres = mediaType === "movie" ? movieGenres : tvGenres;

  const apply = () => {
    const params = new URLSearchParams();
    params.set("mediaType", mediaType);
    params.set("sort", sort);
    if (genre) params.set("genre", String(genre));
    if (year) params.set("year", year);
    if (rating) params.set("rating", rating);

    startTransition(() => {
      router.push(`/discover?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-4 rounded-[2rem] border border-border/50 bg-card/50 p-5">
      <div className="flex flex-wrap gap-3">
        <select
          value={mediaType}
          onChange={event => {
            setMediaType(event.target.value as "movie" | "tv");
            setGenre(undefined);
          }}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="movie">Filme</option>
          <option value="tv">Serien</option>
        </select>
        <select
          value={genre ?? ""}
          onChange={event =>
            setGenre(event.target.value ? Number(event.target.value) : undefined)
          }
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="">Alle Genres</option>
          {genres.map(item => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <input
          value={year}
          onChange={event => setYear(event.target.value)}
          placeholder="Jahr"
          className="h-10 w-28 rounded-xl border border-border/50 bg-background px-3 text-sm"
        />
        <input
          value={rating}
          onChange={event => setRating(event.target.value)}
          placeholder="Min. Rating"
          className="h-10 w-32 rounded-xl border border-border/50 bg-background px-3 text-sm"
        />
        <select
          value={sort}
          onChange={event => setSort(event.target.value)}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="popularity.desc">Beliebtheit</option>
          <option value="vote_average.desc">Bewertung</option>
          <option value="primary_release_date.desc">Neueste Filme</option>
          <option value="first_air_date.desc">Neueste Serien</option>
        </select>
        <Button onClick={apply} disabled={isPending}>
          Filter anwenden
        </Button>
      </div>
    </div>
  );
}
