"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useLanguage } from "@/features/i18n/language-provider";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Viewer } from "@/types/auth";
import type { MediaListItem, MediaType, WatchlistItem, WatchlistTogglePayload } from "@/types/media";

type WatchlistFeedbackUpdate = { watched?: boolean; liked?: boolean | null };

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
  return { tmdbId: item.tmdbId, mediaType: item.mediaType, title: item.title, posterUrl: item.posterUrl, backdropUrl: item.backdropUrl, releaseDate: item.releaseDate, voteAverage: "rating" in item ? item.rating : item.voteAverage };
}

function mapWatchlistRow(data: any): WatchlistItem {
  return { id: data.id, userId: data.user_id, tmdbId: data.tmdb_id, mediaType: data.media_type, title: data.title, posterUrl: data.poster_path, backdropUrl: data.backdrop_path, releaseDate: data.release_date, voteAverage: data.vote_average, watched: data.watched, liked: data.liked, createdAt: data.created_at };
}

export function WatchlistProvider({ children, initialUser, initialWatchlist }: { children: React.ReactNode; initialUser: Viewer | null; initialWatchlist: WatchlistItem[] }) {
  const [user, setUser] = useState(initialUser);
  const [items, setItems] = useState(initialWatchlist);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { locale, dictionary } = useLanguage();
  const text = locale === "en"
    ? {
        loginFirst: "Please sign in to save your watchlist.",
        statusUpdateError: "Status could not be updated.",
        ratingSaved: "Personal rating saved.",
        removeError: "Entry could not be removed.",
        removed: "Removed from watchlist.",
        saveError: "Entry could not be saved.",
        added: "Added to watchlist."
      }
    : {
        loginFirst: "Bitte melde dich an, um deine Watchlist zu speichern.",
        statusUpdateError: "Status konnte nicht aktualisiert werden.",
        ratingSaved: "Persönliche Bewertung gespeichert.",
        removeError: "Eintrag konnte nicht entfernt werden.",
        removed: "Aus der Watchlist entfernt.",
        saveError: "Eintrag konnte nicht gespeichert werden.",
        added: "Zur Watchlist hinzugefügt."
      };
  const supabase = useMemo(() => (isSupabaseConfigured() ? createSupabaseBrowserClient() : null), []);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    setItems(initialWatchlist);
  }, [initialWatchlist]);

  const isSaved = (tmdbId: number, mediaType: MediaType) => items.some(item => item.tmdbId === tmdbId && item.mediaType === mediaType);
  const getItem = (tmdbId: number, mediaType: MediaType) => items.find(item => item.tmdbId === tmdbId && item.mediaType === mediaType);

  const ensureAuthenticated = () => {
    if (user) {
      return true;
    }

    toast.info(text.loginFirst);
    router.push(`/auth/login?next=${encodeURIComponent(pathname || "/watchlist")}`);
    return false;
  };

  const updateFeedback = async (itemId: string, updates: WatchlistFeedbackUpdate) => {
    if (!ensureAuthenticated()) return;
    if (!supabase) { toast.error(dictionary.auth.supabaseNotConfigured); return; }

    const existing = items.find(item => item.id === itemId);
    if (!existing) return;

    const normalizedUpdates: WatchlistFeedbackUpdate = { ...updates };
    if (normalizedUpdates.watched === false) normalizedUpdates.liked = null;

    const previous = items;
    setLoading(true);
    setItems(current => current.map(item => item.id === itemId ? { ...item, ...normalizedUpdates } : item));

    const { data, error } = await (supabase.from("watchlist_items") as any).update(normalizedUpdates).eq("id", itemId).select().single();

    if (error || !data) {
      setItems(previous);
      toast.error(text.statusUpdateError);
      setLoading(false);
      return;
    }

    setItems(current => current.map(item => (item.id === itemId ? mapWatchlistRow(data) : item)));
    toast.success(text.ratingSaved);
    router.refresh();
    setLoading(false);
  };

  const toggleItem = async (item: MediaListItem | WatchlistTogglePayload) => {
    if (!ensureAuthenticated()) return;
    if (!supabase || !user) { toast.error(dictionary.auth.supabaseNotConfigured); return; }

    const payload = toTogglePayload(item);
    const existing = items.find(entry => entry.tmdbId === payload.tmdbId && entry.mediaType === payload.mediaType);
    setLoading(true);

    if (existing) {
      const previous = items;
      setItems(current => current.filter(entry => entry.id !== existing.id));
      const { error } = await (supabase.from("watchlist_items") as any).delete().eq("id", existing.id);
      if (error) { setItems(previous); toast.error(text.removeError); } else { toast.success(text.removed); router.refresh(); }
      setLoading(false);
      return;
    }

    const optimisticItem: WatchlistItem = { id: `${payload.mediaType}-${payload.tmdbId}`, userId: user.id, tmdbId: payload.tmdbId, mediaType: payload.mediaType, title: payload.title, posterUrl: payload.posterUrl, backdropUrl: payload.backdropUrl, releaseDate: payload.releaseDate, voteAverage: payload.voteAverage, watched: false, liked: null, createdAt: new Date().toISOString() };
    const previous = items;
    setItems(current => [optimisticItem, ...current]);

    const { data, error } = await (supabase.from("watchlist_items") as any).insert({ user_id: user.id, tmdb_id: payload.tmdbId, media_type: payload.mediaType, title: payload.title, poster_path: payload.posterUrl, backdrop_path: payload.backdropUrl, release_date: payload.releaseDate, vote_average: payload.voteAverage, watched: false, liked: null }).select().single();

    if (error || !data) {
      setItems(previous);
      toast.error(text.saveError);
      setLoading(false);
      return;
    }

    setItems(current => current.map(entry => (entry.id === optimisticItem.id ? mapWatchlistRow(data) : entry)));
    toast.success(text.added);
    router.refresh();
    setLoading(false);
  };

  return <WatchlistContext.Provider value={{ user, items, loading, isSaved, getItem, toggleItem, updateFeedback }}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) throw new Error("useWatchlist must be used within WatchlistProvider");
  return context;
}
