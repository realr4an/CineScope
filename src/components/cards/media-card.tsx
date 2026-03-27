"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatYear, getRatingTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MediaListItem } from "@/types/media";

const FALLBACK_POSTER =
  "https://placehold.co/500x750/181414/f5f5f4?text=CineScope";

export function getMediaHref(item: Pick<MediaListItem, "mediaType" | "tmdbId">) {
  return `/${item.mediaType}/${item.tmdbId}`;
}

export function MediaCard({
  item,
  isFavorite,
  onFavoriteToggle,
  className
}: {
  item: MediaListItem;
  isFavorite?: boolean;
  onFavoriteToggle?: (item: MediaListItem) => void;
  className?: string;
}) {
  return (
    <div className={cn("group w-full", className)}>
      <Link href={getMediaHref(item)} className="block">
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card transition-transform duration-300 group-hover:-translate-y-1">
          <div className="poster-aspect relative overflow-hidden bg-muted">
            <img
              src={item.posterUrl ?? FALLBACK_POSTER}
              alt={`${item.title} Poster`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-90" />
            <div className="absolute left-3 top-3">
              <Badge variant="secondary">
                {item.mediaType === "movie" ? "Film" : "Serie"}
              </Badge>
            </div>
            {onFavoriteToggle ? (
              <button
                type="button"
                aria-label={isFavorite ? "Aus Watchlist entfernen" : "Zur Watchlist hinzufügen"}
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFavoriteToggle(item);
                }}
                className={cn(
                  "absolute right-3 top-3 flex size-9 items-center justify-center rounded-full border backdrop-blur transition-colors",
                  isFavorite
                    ? "border-primary/40 bg-primary text-primary-foreground"
                    : "border-white/10 bg-black/40 text-white/80 hover:bg-primary/80 hover:text-primary-foreground"
                )}
              >
                <Heart className={cn("size-4", isFavorite ? "fill-current" : "")} />
              </button>
            ) : null}
            <div className="absolute bottom-3 right-3">
              <div
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold backdrop-blur",
                  getRatingTone(item.rating)
                )}
              >
                <Star className="size-3 fill-current" />
                {item.rating.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="space-y-1 p-3">
            <h3 className="line-clamp-2 text-sm font-semibold transition-colors group-hover:text-primary">
              {item.title}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatYear(item.releaseDate)}
              {item.genres[0] ? ` · ${item.genres[0].name}` : ""}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
