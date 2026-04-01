"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SearchForm } from "@/features/search/search-form";
import {
  SearchSidebarFilters,
  type SearchDraftState
} from "@/features/search/search-sidebar-filters";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import type { Genre } from "@/types/media";
import type { WatchRegion } from "@/types/watch-providers";

const SEARCH_DRAFT_STORAGE_KEY = "cine-search-controls-draft-v1";

function buildSearchHref(input: SearchDraftState) {
  const params = new URLSearchParams();

  if (input.query.trim()) {
    params.set("q", input.query.trim());
  }

  params.set("type", input.type);
  params.set("sort", input.sort);
  params.set("direction", input.direction);
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

  for (const providerId of input.providers) {
    params.append("providers", String(providerId));
  }

  return `/search?${params.toString()}`;
}

function isDefaultDraft(input: SearchDraftState) {
  return (
    input.query.trim().length === 0 &&
    input.type === "all" &&
    input.sort === "popularity" &&
    input.direction === "desc" &&
    input.genre === undefined &&
    input.yearFrom === undefined &&
    input.yearTo === undefined &&
    input.rating === undefined &&
    input.providers.length === 0
  );
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
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDraft(initial);
      return;
    }

    if (!hydratedRef.current) {
      hydratedRef.current = true;

      if (isDefaultDraft(initial)) {
        try {
          const rawValue = window.sessionStorage.getItem(SEARCH_DRAFT_STORAGE_KEY);
          if (rawValue) {
            const parsed = JSON.parse(rawValue) as SearchDraftState;
            setDraft(parsed);
            return;
          }
        } catch {
          // ignore invalid storage content
        }
      }
    }

    setDraft(initial);
  }, [initial]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(SEARCH_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore storage write failures
    }
  }, [draft]);

  const resetState = useMemo<SearchDraftState>(
    () => ({
      query: draft.query,
      type: "all",
      sort: "popularity",
      direction: "desc",
      genre: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      rating: undefined,
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
