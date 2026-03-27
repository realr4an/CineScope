"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SearchField } from "@/components/shared/ui-components";
import { Button } from "@/components/ui/button";

export function SearchForm({
  initialQuery,
  initialType,
  initialSort
}: {
  initialQuery: string;
  initialType: "all" | "movie" | "tv";
  initialSort: "popularity" | "rating" | "release_date";
}) {
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState(initialType);
  const [sort, setSort] = useState(initialSort);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    params.set("type", type);
    params.set("sort", sort);

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-4 rounded-[2rem] border border-border/50 bg-card/50 p-5">
      <SearchField
        value={query}
        onChange={setQuery}
        onClear={() => setQuery("")}
        className="max-w-3xl"
      />
      <div className="flex flex-wrap gap-3">
        <select
          value={type}
          onChange={event => setType(event.target.value as "all" | "movie" | "tv")}
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="all">Alle</option>
          <option value="movie">Filme</option>
          <option value="tv">Serien</option>
        </select>
        <select
          value={sort}
          onChange={event =>
            setSort(event.target.value as "popularity" | "rating" | "release_date")
          }
          className="h-10 rounded-xl border border-border/50 bg-background px-3 text-sm"
        >
          <option value="popularity">Beliebtheit</option>
          <option value="rating">Bewertung</option>
          <option value="release_date">Erscheinungsdatum</option>
        </select>
        <Button onClick={submit} disabled={isPending}>
          Suchen
        </Button>
      </div>
    </div>
  );
}
