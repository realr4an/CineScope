"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_WATCH_REGION,
  deriveWatchRegionFromLocale,
  getWatchRegionDisplayName,
  normalizeWatchRegionCode,
  WATCH_REGION_COOKIE_NAME,
  WATCH_REGION_STORAGE_KEY
} from "@/lib/tmdb/watch-provider-preference";
import type { WatchRegion } from "@/types/watch-providers";

export { deriveWatchRegionFromLocale as deriveRegionFromLocale, getWatchRegionDisplayName as getRegionDisplayName };

export function loadPreferredRegion() {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeWatchRegionCode(window.localStorage.getItem(WATCH_REGION_STORAGE_KEY));
}

export function savePreferredRegion(regionCode: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedRegion = normalizeWatchRegionCode(regionCode) ?? DEFAULT_WATCH_REGION;
  window.localStorage.setItem(WATCH_REGION_STORAGE_KEY, normalizedRegion);
  document.cookie = `${WATCH_REGION_COOKIE_NAME}=${normalizedRegion}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function getPreferredRegion(
  availableRegionCodes: string[],
  initialRegionCode?: string | null
) {
  const availableCodes = new Set(availableRegionCodes.map(code => code.toUpperCase()));
  const candidates: Array<string | null> = [];

  candidates.push(loadPreferredRegion());
  candidates.push(normalizeWatchRegionCode(initialRegionCode));

  if (typeof window !== "undefined") {
    const browserLocales = window.navigator.languages?.length
      ? window.navigator.languages
      : [window.navigator.language];

    for (const locale of browserLocales) {
      candidates.push(deriveWatchRegionFromLocale(locale));
    }
  }

  candidates.push(DEFAULT_WATCH_REGION);

  for (const candidate of candidates) {
    if (candidate && availableCodes.has(candidate)) {
      return candidate;
    }
  }

  return availableRegionCodes[0] ?? DEFAULT_WATCH_REGION;
}

export function useRegionPreference(regions: WatchRegion[], initialRegionCode?: string | null) {
  const [regionCode, setRegionCodeState] = useState(DEFAULT_WATCH_REGION);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!regions.length) {
      return;
    }

    setRegionCodeState(
      getPreferredRegion(
        regions.map(region => region.regionCode),
        initialRegionCode
      )
    );
    setIsReady(true);
  }, [initialRegionCode, regions]);

  const setRegionCode = useCallback((nextRegionCode: string) => {
    const normalizedRegion = normalizeWatchRegionCode(nextRegionCode) ?? DEFAULT_WATCH_REGION;
    savePreferredRegion(normalizedRegion);
    setRegionCodeState(normalizedRegion);
  }, []);

  return {
    regionCode,
    isReady,
    setRegionCode
  };
}
