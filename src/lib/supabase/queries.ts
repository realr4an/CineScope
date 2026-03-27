import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Viewer } from "@/types/auth";
import type { WatchlistItem } from "@/types/media";

export async function getViewer() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const viewer: Viewer = {
    id: user.id,
    email: user.email ?? null
  };

  return viewer;
}

export async function getWatchlistForViewer(): Promise<WatchlistItem[]> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await (supabase.from("watchlist_items") as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    tmdbId: item.tmdb_id,
    mediaType: item.media_type,
    title: item.title,
    posterUrl: item.poster_path,
    backdropUrl: item.backdrop_path,
    releaseDate: item.release_date,
    voteAverage: item.vote_average,
    watched: item.watched,
    liked: item.liked,
    createdAt: item.created_at
  }));
}
