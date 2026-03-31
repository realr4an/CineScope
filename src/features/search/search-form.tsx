"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SearchField } from "@/components/shared/ui-components";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";

export function SearchForm({
  initialQuery,
  initialType,
  initialSort,
  initialGenre,
  initialYearFrom,
  initialYearTo,
  initialRating,
  initialRegion,
  initialProviders
}: {
  initialQuery: string;
  initialType: "all" | "movie" | "tv";
  initialSort: "popularity" | "rating" | "release_date";
  initialGenre?: number;
  initialYearFrom?: number;
  initialYearTo?: number;
  initialRating?: number;
  initialRegion: string;
  initialProviders: number[];
}) {
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { dictionary } = useLanguage();

  const submit = () => {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    params.set("type", initialType);
    params.set("sort", initialSort);
    params.set("page", "1");
    params.set("region", initialRegion);
    if (initialType !== "all" && initialGenre) {
      params.set("genre", String(initialGenre));
    }
    if (initialYearFrom) {
      params.set("yearFrom", String(initialYearFrom));
    }
    if (initialYearTo) {
      params.set("yearTo", String(initialYearTo));
    }
    if (initialRating !== undefined) {
      params.set("rating", String(initialRating));
    }
    for (const providerId of initialProviders) {
      params.append("providers", String(providerId));
    }

    const target = `/search?${params.toString()}`;
    const currentSearch = searchParams?.toString() ?? "";
    const current = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;

    startTransition(() => {
      if (current === target) {
        router.refresh();
        return;
      }

      router.push(target);
    });
  };

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3 rounded-[2rem] border border-border/50 bg-card/50 p-5 sm:flex-row sm:items-center"
    >
      <SearchField
        value={query}
        onChange={setQuery}
        onClear={() => setQuery("")}
        className="max-w-4xl flex-1"
        placeholder={dictionary.searchForm.searchPlaceholder}
      />
      <Button type="submit" disabled={isPending} className="sm:self-stretch">
        {dictionary.searchForm.search}
      </Button>
    </form>
  );
}
