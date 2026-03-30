export const WATCH_REGION_STORAGE_KEY = "cinescope:watch-region";
export const WATCH_REGION_COOKIE_NAME = "cinescope_watch_region";
export const DEFAULT_WATCH_REGION = "DE";

export function normalizeWatchRegionCode(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function deriveWatchRegionFromLocale(locale: string | null | undefined) {
  if (!locale) {
    return null;
  }

  try {
    const intlLocale = new Intl.Locale(locale);
    return normalizeWatchRegionCode(intlLocale.region ?? intlLocale.maximize().region ?? null);
  } catch {
    const parts = locale.split(/[-_]/);
    return normalizeWatchRegionCode(parts[1]);
  }
}

export function getWatchRegionDisplayName(regionCode: string, locales?: string[]) {
  try {
    const displayNames = new Intl.DisplayNames(locales?.length ? locales : ["de-DE", "en"], {
      type: "region"
    });
    return displayNames.of(regionCode) ?? regionCode;
  } catch {
    return regionCode;
  }
}
