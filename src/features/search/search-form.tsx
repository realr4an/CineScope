"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SearchField } from "@/components/shared/ui-components";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";

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
  const { dictionary } = useLanguage();

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
        <Button type="submit" disabled={isPending}>
          {dictionary.searchForm.search}
        </Button>
      </div>
    </form>
  );
}
