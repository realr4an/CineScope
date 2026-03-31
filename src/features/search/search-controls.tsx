"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SearchForm } from "@/features/search/search-form";
import {
  SearchSidebarFilters,
  type SearchDraftState
} from "@/features/search/search-sidebar-filters";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import type { Genre } from "@/types/media";
import type { WatchRegion } from "@/types/watch-providers";

function buildSearchHref(input: SearchDraftState) {
  const params = new URLSearchParams();

  if (input.query.trim()) {
    params.set("q", input.query.trim());
  }

  params.set("type", input.type);
  params.set("sort", input.sort);
  params.set("page", "1");
  params.set("region", input.region);

  if (input.type !== "all" && input.genre) {
    params.set("genre", String(input.genre));
  }

  if (input.yearFrom) {
    params.set("yearFrom", String(input.yearFrom));
  }

  if (input.yearTo) {
    params.set("yearTo", String(input.yearTo));
  }

  if (input.rating !== undefined) {
    params.set("rating", String(input.rating));
  }

  for (const selectedRating of input.ratings) {
    params.append("ratings", String(selectedRating));
  }

  for (const providerId of input.providers) {
    params.append("providers", String(providerId));
  }

  return `/search?${params.toString()}`;
}

export function SearchControls({
  movieGenres,
  tvGenres,
  availableRegions,
  initial,
  children
}: {
  movieGenres: Genre[];
  tvGenres: Genre[];
  availableRegions: WatchRegion[];
  initial: SearchDraftState;
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<SearchDraftState>(initial);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const resetState = useMemo<SearchDraftState>(
    () => ({
      query: draft.query,
      type: "all",
      sort: "popularity",
      genre: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      rating: undefined,
      ratings: [],
      region: draft.region,
      providers: []
    }),
    [draft.query, draft.region]
  );

  const submit = () => {
    const target = buildSearchHref(draft);
    const currentSearch = searchParams?.toString() ?? "";
    const current = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;

    savePreferredRegion(draft.region);

    startTransition(() => {
      if (current === target) {
        router.refresh();
        return;
      }

      router.push(target);
    });
  };

  return (
    <>
      <SearchForm
        query={draft.query}
        onQueryChange={query => setDraft(current => ({ ...current, query }))}
        onSubmit={submit}
        isPending={isPending}
      />

      <div className="min-w-0 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <SearchSidebarFilters
          movieGenres={movieGenres}
          tvGenres={tvGenres}
          availableRegions={availableRegions}
          value={draft}
          onChange={setDraft}
          onReset={() => setDraft(resetState)}
          isPending={isPending}
        />
        <div className="space-y-4">{children}</div>
      </div>
    </>
  );
}
