import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeBirthDate } from "@/lib/age-gate";
import type { Viewer } from "@/types/auth";
import type { WatchlistItem } from "@/types/media";

export const getViewer = cache(async () => {
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

  const [{ data: profile }, { data: preferences }] = await Promise.all([
    (supabase.from("profiles") as any)
      .select("birth_date, display_name")
      .eq("id", user.id)
      .maybeSingle(),
    (supabase.from("user_preferences") as any)
      .select("preferred_region")
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  const viewer: Viewer = {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? null,
    birthDate: normalizeBirthDate(profile?.birth_date ?? null),
    preferredRegion: preferences?.preferred_region ?? null
  };

  return viewer;
});

export const getWatchlistForViewer = cache(async (): Promise<WatchlistItem[]> => {
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
});
