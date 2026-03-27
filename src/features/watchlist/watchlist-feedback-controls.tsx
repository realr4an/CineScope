"use client";

import { CheckCircle2, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/features/watchlist/watchlist-provider";
import type { MediaListItem, WatchlistItem } from "@/types/media";

export function WatchlistFeedbackControls({
  item,
  media,
  compact = false
}: {
  item?: WatchlistItem;
  media?: MediaListItem;
  compact?: boolean;
}) {
  const { getItem, updateFeedback, loading } = useWatchlist();
  const resolvedItem =
    item ?? (media ? getItem(media.tmdbId, media.mediaType) : undefined);

  if (!resolvedItem) {
    return (
      <p className="text-sm text-muted-foreground">
        Füge den Titel zuerst zur Watchlist hinzu, um ihn als gesehen zu markieren oder zu
        bewerten.
      </p>
    );
  }

  const buttonSize = compact ? "sm" : "default";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={resolvedItem.watched ? "default" : "outline"}
          size={buttonSize}
          disabled={loading}
          onClick={() =>
            updateFeedback(resolvedItem.id, {
              watched: !resolvedItem.watched,
              liked: resolvedItem.watched ? null : resolvedItem.liked
            })
          }
        >
          <CheckCircle2 className={cn("size-4", resolvedItem.watched ? "fill-current" : "")} />
          {resolvedItem.watched ? "Gesehen" : "Als gesehen markieren"}
        </Button>

        <Button
          variant={resolvedItem.liked === true ? "default" : "outline"}
          size={buttonSize}
          disabled={loading || !resolvedItem.watched}
          onClick={() =>
            updateFeedback(resolvedItem.id, {
              liked: resolvedItem.liked === true ? null : true
            })
          }
        >
          <ThumbsUp className="size-4" />
          Gefällt mir
        </Button>

        <Button
          variant={resolvedItem.liked === false ? "destructive" : "outline"}
          size={buttonSize}
          disabled={loading || !resolvedItem.watched}
          onClick={() =>
            updateFeedback(resolvedItem.id, {
              liked: resolvedItem.liked === false ? null : false
            })
          }
        >
          <ThumbsDown className="size-4" />
          Gefällt mir nicht
        </Button>
      </div>

      {!resolvedItem.watched ? (
        <p className="text-xs text-muted-foreground">
          Erst nach dem Abhaken als gesehen kannst du speichern, ob dir der Titel gefallen hat
          oder nicht.
        </p>
      ) : null}
    </div>
  );
}
