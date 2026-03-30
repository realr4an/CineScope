import "server-only";

import { cookies } from "next/headers";

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

  return cookieRegion ?? DEFAULT_WATCH_REGION;
}
