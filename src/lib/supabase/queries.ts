import "server-only";

import { cache } from "react";

import { normalizeBirthDate } from "@/lib/age-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Viewer } from "@/types/auth";
import type { FeedbackEntry } from "@/types/feedback";
import type { WatchlistItem } from "@/types/media";

async function loadViewerData(userId: string) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { profile: null, preferences: null };
  }

  const [{ data: profile }, { data: preferences }] = await Promise.all([
    (supabase.from("profiles") as any)
      .select("birth_date, display_name, is_admin")
      .eq("id", userId)
      .maybeSingle(),
    (supabase.from("user_preferences") as any)
      .select("preferred_region")
      .eq("user_id", userId)
      .maybeSingle()
  ]);

  return { profile, preferences };
}

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

  const { profile, preferences } = await loadViewerData(user.id);

  const viewer: Viewer = {
    id: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? null,
    birthDate: normalizeBirthDate(profile?.birth_date ?? null),
    preferredRegion: preferences?.preferred_region ?? null,
    isAdmin: profile?.is_admin ?? false
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

export const getFeedbackEntriesForAdmin = cache(async (): Promise<FeedbackEntry[]> => {
  const viewer = await getViewer();

  if (!viewer?.isAdmin) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await (supabase.from("feedback_entries") as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    email: item.email,
    displayName: item.display_name,
    category: item.category,
    message: item.message,
    pagePath: item.page_path,
    moderationSummary: item.moderation_summary,
    createdAt: item.created_at
  }));
});
