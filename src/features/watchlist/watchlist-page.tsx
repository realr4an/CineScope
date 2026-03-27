"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";

import { EmptyFavoritesState, EmptyState } from "@/components/states/state-components";
import { FilterChips } from "@/components/shared/ui-components";
import { Button } from "@/components/ui/button";
import { getMediaHref } from "@/components/cards/media-card";
import { formatYear } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WatchlistFeedbackControls } from "@/features/watchlist/watchlist-feedback-controls";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import type { WatchlistItem } from "@/types/media";

const FALLBACK_POSTER =
  "https://placehold.co/500x750/181414/f5f5f4?text=CineScope";

const FILTER_OPTIONS = [
  { label: "Alle", value: "all" },
  { label: "Gesehen", value: "watched" },
  { label: "Gemocht", value: "liked" },
  { label: "Nicht gemocht", value: "disliked" }
] as const;

type WatchlistFilter = (typeof FILTER_OPTIONS)[number]["value"];

function StatusBadge({
  label,
  active,
  tone
}: {
  label: string;
  active: boolean;
  tone: "primary" | "positive" | "negative";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        active
          ? tone === "primary"
            ? "border-primary/40 bg-primary/15 text-primary"
            : tone === "positive"
              ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/12 text-rose-300"
          : "border-border/50 bg-muted/30 text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}

function WatchlistCard({ item }: { item: WatchlistItem }) {
  const { toggleItem, loading } = useWatchlist();

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/60">
      <Link href={getMediaHref(item)} className="block">
        <div className="grid gap-4 p-4 sm:grid-cols-[110px_minmax(0,1fr)] sm:p-5">
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-muted">
            <img
              src={item.posterUrl ?? FALLBACK_POSTER}
              alt={`${item.title} Poster`}
              className="poster-aspect w-full object-cover"
            />
          </div>

          <div className="min-w-0 space-y-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-primary">
                {item.mediaType === "movie" ? "Film" : "Serie"}
              </div>
              <h2 className="break-words text-xl font-semibold leading-tight">{item.title}</h2>
              <p className="text-sm text-muted-foreground">{formatYear(item.releaseDate)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge label="Gesehen" active={item.watched} tone="primary" />
              <StatusBadge label="GefÄllt mir" active={item.liked === true} tone="positive" />
              <StatusBadge
                label="GefÄllt mir nicht"
                active={item.liked === false}
                tone="negative"
              />
            </div>
          </div>
        </div>
      </Link>

      <div className="space-y-4 border-t border-border/40 px-4 py-4 sm:px-5">
        <WatchlistFeedbackControls item={item} />

        <div className="flex flex-wrap gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto w-full justify-start whitespace-normal py-2 text-left sm:w-auto"
            disabled={loading}
            onClick={() => toggleItem(item)}
          >
            <Trash2 className="size-4" />
            Entfernen
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WatchlistPageContent() {
  const { items } = useWatchlist();
  const [filter, setFilter] = useState<WatchlistFilter>("all");

  const filteredItems = useMemo(() => {
    switch (filter) {
      case "watched":
        return items.filter(item => item.watched);
      case "liked":
        return items.filter(item => item.liked === true);
      case "disliked":
        return items.filter(item => item.liked === false);
      default:
        return items;
    }
  }, [filter, items]);

  if (!items.length) {
    return <EmptyFavoritesState action={{ label: "Inhalte entdecken", href: "/" }} />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-border/50 bg-card/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Heart className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Filter
          </h2>
        </div>
        <FilterChips options={[...FILTER_OPTIONS]} value={filter} onChange={setFilter} />
      </div>

      {filteredItems.length ? (
        <div className="space-y-4">
          {filteredItems.map(item => (
            <WatchlistCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Keine passenden Watchlist-Eintraege"
          description="FÜr den aktuell gewÄhlten Filter gibt es noch keine Titel."
          action={{ label: "Alle anzeigen", onClick: () => setFilter("all") }}
        />
      )}
    </div>
  );
}
