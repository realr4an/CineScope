import "server-only";

import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  DEFAULT_WATCH_REGION,
  normalizeWatchRegionCode,
  WATCH_REGION_COOKIE_NAME
} from "@/lib/tmdb/watch-provider-preference";

export async function getServerPreferredWatchRegion(explicitRegion?: string | string[] | undefined) {
  const requestedRegion = Array.isArray(explicitRegion) ? explicitRegion[0] : explicitRegion;
  const normalizedRequestedRegion = normalizeWatchRegionCode(requestedRegion);

  if (normalizedRequestedRegion) {
    return normalizedRequestedRegion;
  }

  const cookieStore = await cookies();
  const cookieRegion = normalizeWatchRegionCode(
    cookieStore.get(WATCH_REGION_COOKIE_NAME)?.value ?? null
  );

  if (cookieRegion) {
    return cookieRegion;
  }

  const supabase = await createSupabaseServerClient();

  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const { data: preferences } = await (supabase.from("user_preferences") as any)
        .select("preferred_region")
        .eq("user_id", user.id)
        .maybeSingle();
      const storedRegion = normalizeWatchRegionCode(preferences?.preferred_region ?? null);

      if (storedRegion) {
        return storedRegion;
      }
    }
  }

  return DEFAULT_WATCH_REGION;
}
