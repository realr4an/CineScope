"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Viewer } from "@/types/auth";
import type {
  MediaListItem,
  MediaType,
  WatchlistItem,
  WatchlistTogglePayload
} from "@/types/media";

type WatchlistFeedbackUpdate = {
  watched?: boolean;
  liked?: boolean | null;
};

interface WatchlistContextValue {
  user: Viewer | null;
  items: WatchlistItem[];
  loading: boolean;
  isSaved: (tmdbId: number, mediaType: MediaType) => boolean;
  getItem: (tmdbId: number, mediaType: MediaType) => WatchlistItem | undefined;
  toggleItem: (item: MediaListItem | WatchlistTogglePayload) => Promise<void>;
  updateFeedback: (itemId: string, updates: WatchlistFeedbackUpdate) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

function toTogglePayload(item: MediaListItem | WatchlistTogglePayload): WatchlistTogglePayload {
  return {
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
    title: item.title,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    releaseDate: item.releaseDate,
    voteAverage: "rating" in item ? item.rating : item.voteAverage
  };
}

function mapWatchlistRow(data: any): WatchlistItem {
  return {
    id: data.id,
    userId: data.user_id,
    tmdbId: data.tmdb_id,
    mediaType: data.media_type,
    title: data.title,
    posterUrl: data.poster_path,
    backdropUrl: data.backdrop_path,
    releaseDate: data.release_date,
    voteAverage: data.vote_average,
    watched: data.watched,
    liked: data.liked,
    createdAt: data.created_at
  };
}

export function WatchlistProvider({
  children,
  initialUser,
  initialWatchlist
}: {
  children: React.ReactNode;
  initialUser: Viewer | null;
  initialWatchlist: WatchlistItem[];
}) {
  const [items, setItems] = useState(initialWatchlist);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(
    () => (isSupabaseConfigured() ? createSupabaseBrowserClient() : null),
    []
  );

  const isSaved = (tmdbId: number, mediaType: MediaType) =>
    items.some(item => item.tmdbId === tmdbId && item.mediaType === mediaType);

  const getItem = (tmdbId: number, mediaType: MediaType) =>
    items.find(item => item.tmdbId === tmdbId && item.mediaType === mediaType);

  const ensureAuthenticated = () => {
    if (initialUser) {
      return true;
    }

    toast.info("Bitte melde dich an, um deine Watchlist zu speichern.");
    router.push(`/auth/login?next=${encodeURIComponent(pathname || "/watchlist")}`);
    return false;
  };

  const updateFeedback = async (itemId: string, updates: WatchlistFeedbackUpdate) => {
    if (!ensureAuthenticated()) {
      return;
    }

    if (!supabase) {
      toast.error("Supabase ist nicht konfiguriert.");
      return;
    }

    const existing = items.find(item => item.id === itemId);

    if (!existing) {
      return;
    }

    const normalizedUpdates: WatchlistFeedbackUpdate = {
      ...updates
    };

    if (normalizedUpdates.watched === false) {
      normalizedUpdates.liked = null;
    }

    const previous = items;
    setLoading(true);
    setItems(current =>
      current.map(item =>
        item.id === itemId
          ? {
              ...item,
              ...normalizedUpdates
            }
          : item
      )
    );

    const { data, error } = await (supabase.from("watchlist_items") as any)
      .update(normalizedUpdates)
      .eq("id", itemId)
      .select()
      .single();

    if (error || !data) {
      setItems(previous);
      toast.error("Status konnte nicht aktualisiert werden.");
      setLoading(false);
      return;
    }

    setItems(current =>
      current.map(item => (item.id === itemId ? mapWatchlistRow(data) : item))
    );
    toast.success("Persönliche Bewertung gespeichert.");
    router.refresh();
    setLoading(false);
  };

  const toggleItem = async (item: MediaListItem | WatchlistTogglePayload) => {
    if (!ensureAuthenticated()) {
      return;
    }

    if (!supabase || !initialUser) {
      toast.error("Supabase ist nicht konfiguriert.");
      return;
    }

    const payload = toTogglePayload(item);
    const existing = items.find(
      entry =>
        entry.tmdbId === payload.tmdbId && entry.mediaType === payload.mediaType
    );

    setLoading(true);

    if (existing) {
      const previous = items;
      setItems(current => current.filter(entry => entry.id !== existing.id));

      const { error } = await (supabase.from("watchlist_items") as any)
        .delete()
        .eq("id", existing.id);

      if (error) {
        setItems(previous);
        toast.error("Eintrag konnte nicht entfernt werden.");
      } else {
        toast.success("Aus der Watchlist entfernt.");
        router.refresh();
      }

      setLoading(false);
      return;
    }

    const optimisticItem: WatchlistItem = {
      id: `${payload.mediaType}-${payload.tmdbId}`,
      userId: initialUser.id,
      tmdbId: payload.tmdbId,
      mediaType: payload.mediaType,
      title: payload.title,
      posterUrl: payload.posterUrl,
      backdropUrl: payload.backdropUrl,
      releaseDate: payload.releaseDate,
      voteAverage: payload.voteAverage,
      watched: false,
      liked: null,
      createdAt: new Date().toISOString()
    };

    const previous = items;
    setItems(current => [optimisticItem, ...current]);

    const { data, error } = await (supabase.from("watchlist_items") as any)
      .insert({
        user_id: initialUser.id,
        tmdb_id: payload.tmdbId,
        media_type: payload.mediaType,
        title: payload.title,
        poster_path: payload.posterUrl,
        backdrop_path: payload.backdropUrl,
        release_date: payload.releaseDate,
        vote_average: payload.voteAverage,
        watched: false,
        liked: null
      })
      .select()
      .single();

    if (error || !data) {
      setItems(previous);
      toast.error("Eintrag konnte nicht gespeichert werden.");
      setLoading(false);
      return;
    }

    setItems(current =>
      current.map(entry => (entry.id === optimisticItem.id ? mapWatchlistRow(data) : entry))
    );
    toast.success("Zur Watchlist hinzugefügt.");
    router.refresh();
    setLoading(false);
  };

  return (
    <WatchlistContext.Provider
      value={{
        user: initialUser,
        items,
        loading,
        isSaved,
        getItem,
        toggleItem,
        updateFeedback
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);

  if (!context) {
    throw new Error("useWatchlist must be used within WatchlistProvider");
  }

  return context;
}
