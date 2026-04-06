"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SearchForm } from "@/features/search/search-form";
import {
  SearchSidebarFilters,
  type SearchDraftState
} from "@/features/search/search-sidebar-filters";
import { useLanguage } from "@/features/i18n/language-provider";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import { cn } from "@/lib/utils";
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
  const draftRef = useRef<SearchDraftState>(initial);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydratedRef = useRef(false);
  const { locale } = useLanguage();
  const loadingText = locale === "en" ? "Loading updated search..." : "Aktualisierte Suche wird geladen...";
  const filterToggleLabel = isFiltersOpen
    ? locale === "en"
      ? "Hide filters"
      : "Filter ausblenden"
    : locale === "en"
      ? "Show filters"
      : "Filter anzeigen";
  const searchParamsValue = searchParams?.toString() ?? "";

  useEffect(() => {
    if (typeof window === "undefined") {
      draftRef.current = initial;
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
          draftRef.current = parsed;
          setDraft(parsed);
          return;
        }
        } catch {
          // ignore invalid storage content
        }
      }
    }

    draftRef.current = initial;
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

  useEffect(() => {
    setIsFiltersOpen(false);
  }, [searchParamsValue]);

  const updateDraft = (
    next:
      | SearchDraftState
      | ((current: SearchDraftState) => SearchDraftState)
  ) => {
    setDraft(current => {
      const resolved = typeof next === "function" ? next(current) : next;
      draftRef.current = resolved;
      return resolved;
    });
  };

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
    const latestDraft = draftRef.current;
    const target = buildSearchHref(latestDraft);
    const currentSearch = searchParams?.toString() ?? "";
    const current = `${pathname}${currentSearch ? `?${currentSearch}` : ""}`;

    savePreferredRegion(latestDraft.region);

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
        onQueryChange={query => updateDraft(current => ({ ...current, query }))}
        onSubmit={submit}
        isPending={isPending}
      />
      {isPending ? (
        <div
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : null}
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
          isFiltersOpen ? "lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start" : ""
        )}
      >
        {isFiltersOpen ? (
          <SearchSidebarFilters
            movieGenres={movieGenres}
            tvGenres={tvGenres}
            availableRegions={availableRegions}
            value={draft}
            onChange={updateDraft}
            onReset={() => updateDraft(resetState)}
            isPending={isPending}
          />
        ) : null}
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </>
  );
}
