"use client";

import { useCallback, useEffect, useState } from "react";

import type { WatchRegion } from "@/types/watch-providers";

const REGION_STORAGE_KEY = "cinescope:watch-region";
const DEFAULT_REGION = "DE";

function normalizeRegionCode(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function deriveRegionFromLocale(locale: string | null | undefined) {
  if (!locale) {
    return null;
  }

  try {
    const intlLocale = new Intl.Locale(locale);
    return normalizeRegionCode(intlLocale.region ?? intlLocale.maximize().region ?? null);
  } catch {
    const parts = locale.split(/[-_]/);
    return normalizeRegionCode(parts[1]);
  }
}

export function getRegionDisplayName(regionCode: string, locales?: string[]) {
  try {
    const displayNames = new Intl.DisplayNames(locales?.length ? locales : ["de-DE", "en"], {
      type: "region"
    });
    return displayNames.of(regionCode) ?? regionCode;
  } catch {
    return regionCode;
  }
}

export function loadPreferredRegion() {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeRegionCode(window.localStorage.getItem(REGION_STORAGE_KEY));
}

export function savePreferredRegion(regionCode: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REGION_STORAGE_KEY, regionCode.toUpperCase());
}

export function getPreferredRegion(availableRegionCodes: string[]) {
  const availableCodes = new Set(availableRegionCodes.map(code => code.toUpperCase()));
  const candidates: Array<string | null> = [];

  candidates.push(loadPreferredRegion());

  if (typeof window !== "undefined") {
    const browserLocales = window.navigator.languages?.length
      ? window.navigator.languages
      : [window.navigator.language];

    for (const locale of browserLocales) {
      candidates.push(deriveRegionFromLocale(locale));
    }
  }

  candidates.push(DEFAULT_REGION);

  for (const candidate of candidates) {
    if (candidate && availableCodes.has(candidate)) {
      return candidate;
    }
  }

  return availableRegionCodes[0] ?? DEFAULT_REGION;
}

export function useRegionPreference(regions: WatchRegion[]) {
  const [regionCode, setRegionCodeState] = useState(DEFAULT_REGION);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!regions.length) {
      return;
    }

    setRegionCodeState(getPreferredRegion(regions.map(region => region.regionCode)));
    setIsReady(true);
  }, [regions]);

  const setRegionCode = useCallback((nextRegionCode: string) => {
    const normalizedRegion = normalizeRegionCode(nextRegionCode) ?? DEFAULT_REGION;
    savePreferredRegion(normalizedRegion);
    setRegionCodeState(normalizedRegion);
  }, []);

  return {
    regionCode,
    isReady,
    setRegionCode
  };
}
