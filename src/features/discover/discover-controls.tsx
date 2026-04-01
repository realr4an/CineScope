"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  SearchSidebarFilters,
  type SearchDraftState
} from "@/features/search/search-sidebar-filters";
import { useLanguage } from "@/features/i18n/language-provider";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import type { Genre } from "@/types/media";
import type { WatchRegion } from "@/types/watch-providers";

function buildDiscoverHref(input: SearchDraftState) {
  const params = new URLSearchParams();

  params.set("type", input.type);
  params.set("sort", input.sort);
  params.set("direction", input.direction);
  params.set("page", "1");
  params.set("region", input.region);

  if (input.genre) {
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

  return `/discover?${params.toString()}`;
}

export function DiscoverControls({
  movieGenres,
  tvGenres,
  availableRegions,
  initial
}: {
  movieGenres: Genre[];
  tvGenres: Genre[];
  availableRegions: WatchRegion[];
  initial: SearchDraftState;
}) {
  const [draft, setDraft] = useState<SearchDraftState>(initial);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { dictionary } = useLanguage();

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  const resetDraft = () => {
    setDraft(current => ({
      ...current,
      query: "",
      sort: "popularity",
      direction: "desc",
      genre: undefined,
      yearFrom: undefined,
      yearTo: undefined,
      rating: undefined,
      providers: []
    }));
  };

  const apply = () => {
    const nextDraft = {
      ...draft,
      type: draft.type === "all" ? "movie" : draft.type
    };
    savePreferredRegion(nextDraft.region);

    startTransition(() => {
      router.push(buildDiscoverHref(nextDraft));
    });
  };

  return (
    <SearchSidebarFilters
      movieGenres={movieGenres}
      tvGenres={tvGenres}
      availableRegions={availableRegions}
      value={draft}
      onChange={setDraft}
      onReset={resetDraft}
      isPending={isPending}
      typeOptions={["movie", "tv"]}
      primaryAction={{
        label: dictionary.discoverFilters.apply,
        onClick: apply
      }}
    />
  );
}
