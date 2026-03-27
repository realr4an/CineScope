import type { Locale } from "@/lib/i18n/types";
import { LANGUAGE_COOKIE } from "@/lib/i18n/types";

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en" ? "en" : "de";
}

export function getLocaleFromCookieHeader(cookieHeader: string | null | undefined): Locale {
  if (!cookieHeader) {
    return "de";
  }

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === LANGUAGE_COOKIE) {
      return normalizeLocale(rawValue.join("="));
    }
  }

  return "de";
}
