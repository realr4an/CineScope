"use client";

import { CheckCircle2, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
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
  const { dictionary } = useLanguage();
  const resolvedItem = item ?? (media ? getItem(media.tmdbId, media.mediaType) : undefined);

  if (!resolvedItem) {
    return <p className="text-sm text-muted-foreground">{dictionary.watchlist.saveFirst}</p>;
  }

  const buttonSize = compact ? "sm" : "default";
  const buttonClassName = compact
    ? "h-auto w-full justify-start whitespace-normal py-2 text-left sm:w-auto"
    : "h-auto w-full justify-start whitespace-normal py-2 text-left sm:w-auto sm:justify-center";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          variant={resolvedItem.watched ? "default" : "outline"}
          size={buttonSize}
          className={buttonClassName}
          disabled={loading}
          onClick={() =>
            updateFeedback(resolvedItem.id, {
              watched: !resolvedItem.watched,
              liked: resolvedItem.watched ? null : resolvedItem.liked
            })
          }
        >
          <CheckCircle2 className={cn("size-4", resolvedItem.watched ? "fill-current" : "")} />
          {resolvedItem.watched ? dictionary.watchlist.watched : dictionary.watchlist.markWatched}
        </Button>

        <Button
          variant={resolvedItem.liked === true ? "default" : "outline"}
          size={buttonSize}
          className={buttonClassName}
          disabled={loading || !resolvedItem.watched}
          onClick={() =>
            updateFeedback(resolvedItem.id, {
              liked: resolvedItem.liked === true ? null : true
            })
          }
        >
          <ThumbsUp className="size-4" />
          {dictionary.watchlist.like}
        </Button>

        <Button
          variant={resolvedItem.liked === false ? "destructive" : "outline"}
          size={buttonSize}
          className={buttonClassName}
          disabled={loading || !resolvedItem.watched}
          onClick={() =>
            updateFeedback(resolvedItem.id, {
              liked: resolvedItem.liked === false ? null : false
            })
          }
        >
          <ThumbsDown className="size-4" />
          {dictionary.watchlist.dislike}
        </Button>
      </div>

      {!resolvedItem.watched ? (
        <p className="text-xs text-muted-foreground">{dictionary.watchlist.rateAfterWatch}</p>
      ) : null}
    </div>
  );
}
