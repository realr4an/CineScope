"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SearchSidebarFilters,
  type SearchDraftState
} from "@/features/search/search-sidebar-filters";
import { useLanguage } from "@/features/i18n/language-provider";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import { cn } from "@/lib/utils";
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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dictionary, locale } = useLanguage();
  const filterToggleLabel = isFiltersOpen
    ? locale === "en"
      ? "Hide filters"
      : "Filter ausblenden"
    : locale === "en"
      ? "Show filters"
      : "Filter anzeigen";
  const searchParamsValue = searchParams?.toString() ?? "";

  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  useEffect(() => {
    setIsFiltersOpen(false);
  }, [searchParamsValue]);

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
    const nextDraft = { ...draft };
    savePreferredRegion(nextDraft.region);

    startTransition(() => {
      router.push(buildDiscoverHref(nextDraft));
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsFiltersOpen(current => !current)}
        aria-expanded={isFiltersOpen}
        className="w-full justify-between sm:w-auto"
      >
        {filterToggleLabel}
        <ChevronDown className={cn("size-4 transition-transform", isFiltersOpen ? "rotate-180" : "")} />
      </Button>
      <div
        className={cn(
          "min-w-0 grid gap-6",
          isFiltersOpen ? "lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start" : ""
        )}
      >
        {isFiltersOpen ? (
          <SearchSidebarFilters
            movieGenres={movieGenres}
            tvGenres={tvGenres}
            availableRegions={availableRegions}
            value={draft}
            onChange={setDraft}
            onReset={resetDraft}
            isPending={isPending}
            typeOptions={["all", "movie", "tv"]}
            hideCategoryFilter
            hideMediaTypeFilter
            primaryAction={{
              label: dictionary.discoverFilters.apply,
              onClick: apply
            }}
          />
        ) : null}
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </>
  );
}
