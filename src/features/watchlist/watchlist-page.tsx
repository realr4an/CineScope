"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckSquare, Heart, Square, Trash2 } from "lucide-react";

import { AIWatchlistPriorityPanel, MAX_PRIORITY_SELECTIONS } from "@/features/ai/watchlist-priority-panel";
import { EmptyState } from "@/components/states/state-components";
import { FilterChips } from "@/components/shared/ui-components";
import { Button } from "@/components/ui/button";
import { getMediaHref } from "@/components/cards/media-card";
import { formatYear } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/features/i18n/language-provider";
import { WatchlistFeedbackControls } from "@/features/watchlist/watchlist-feedback-controls";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import type { WatchlistItem } from "@/types/media";

const FALLBACK_POSTER = "https://placehold.co/500x750/181414/f5f5f4?text=CineScope";

type WatchlistFilter = "all" | "watched" | "liked" | "disliked";

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

function WatchlistCard({
  item,
  selected,
  canSelectMore,
  onToggleSelect
}: {
  item: WatchlistItem;
  selected: boolean;
  canSelectMore: boolean;
  onToggleSelect: () => void;
}) {
  const { toggleItem, loading } = useWatchlist();
  const { dictionary, locale } = useLanguage();
  const selectionText =
    locale === "en"
      ? {
          select: "Select for watch order",
          selected: "Selected for watch order",
          limitReached: "Selection limit reached"
        }
      : {
          select: "Für Reihenfolge auswählen",
          selected: "Für Reihenfolge ausgewählt",
          limitReached: "Auswahl-Limit erreicht"
        };

  const selectionDisabled = !selected && !canSelectMore;

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
                {item.mediaType === "movie" ? dictionary.common.movie : dictionary.common.tv}
              </div>
              <h2 className="break-words text-xl font-semibold leading-tight">{item.title}</h2>
              <p className="text-sm text-muted-foreground">{formatYear(item.releaseDate)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge label={dictionary.watchlist.watched} active={item.watched} tone="primary" />
              <StatusBadge label={dictionary.watchlist.likedMe} active={item.liked === true} tone="positive" />
              <StatusBadge
                label={dictionary.watchlist.dislikedMe}
                active={item.liked === false}
                tone="negative"
              />
            </div>
          </div>
        </div>
      </Link>

      <div className="space-y-4 border-t border-border/40 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap gap-3">
          <Button
            variant={selected ? "default" : "outline"}
            size="sm"
            className="h-auto w-full justify-start whitespace-normal py-2 text-left sm:w-auto"
            disabled={selectionDisabled}
            onClick={onToggleSelect}
          >
            {selected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
            {selected ? selectionText.selected : selectionDisabled ? selectionText.limitReached : selectionText.select}
          </Button>
        </div>

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
            {dictionary.watchlist.remove}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WatchlistPageContent() {
  const { items } = useWatchlist();
  const { dictionary } = useLanguage();
  const [filter, setFilter] = useState<WatchlistFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filterOptions = [
    { label: dictionary.watchlist.all, value: "all" as const },
    { label: dictionary.watchlist.watched, value: "watched" as const },
    { label: dictionary.watchlist.liked, value: "liked" as const },
    { label: dictionary.watchlist.disliked, value: "disliked" as const }
  ];

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

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  const toggleSelection = (itemId: string) => {
    setSelectedIds(current => {
      if (current.includes(itemId)) {
        return current.filter(id => id !== itemId);
      }

      if (current.length >= MAX_PRIORITY_SELECTIONS) {
        return current;
      }

      return [...current, itemId];
    });
  };

  const clearSelection = () => setSelectedIds([]);

  if (!items.length) {
    return (
      <EmptyState
        title={dictionary.watchlist.noItemsTitle}
        description={dictionary.watchlist.noItemsDescription}
        action={{ label: dictionary.watchlist.emptyAction, href: "/" }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <AIWatchlistPriorityPanel selectedItems={selectedItems} onClearSelection={clearSelection} />

      <div className="rounded-[1.5rem] border border-border/50 bg-card/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Heart className="size-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {dictionary.watchlist.filter}
          </h2>
        </div>
        <FilterChips options={filterOptions} value={filter} onChange={setFilter} />
      </div>

      {filteredItems.length ? (
        <div className="space-y-4">
          {filteredItems.map(item => (
            <WatchlistCard
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              canSelectMore={selectedIds.length < MAX_PRIORITY_SELECTIONS}
              onToggleSelect={() => toggleSelection(item.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={dictionary.watchlist.noFilteredTitle}
          description={dictionary.watchlist.noFilteredDescription}
          action={{ label: dictionary.watchlist.showAll, onClick: () => setFilter("all") }}
        />
      )}
    </div>
  );
}
