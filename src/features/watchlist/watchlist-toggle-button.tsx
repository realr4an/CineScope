"use client";

import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import type { MediaListItem } from "@/types/media";

export function WatchlistToggleButton({ item }: { item: MediaListItem }) {
  const { isSaved, toggleItem, loading } = useWatchlist();
  const { dictionary } = useLanguage();
  const saved = isSaved(item.tmdbId, item.mediaType);

  return (
    <Button
      variant={saved ? "default" : "outline"}
      size="lg"
      onClick={() => toggleItem(item)}
      disabled={loading}
    >
      <Heart className={`size-4 ${saved ? "fill-current" : ""}`} />
      {saved ? dictionary.watchlist.saved : dictionary.watchlist.addToWatchlist}
    </Button>
  );
}
