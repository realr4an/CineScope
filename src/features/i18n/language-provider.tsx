"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { LANGUAGE_COOKIE, type Locale } from "@/lib/i18n/types";


type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dictionary: ReturnType<typeof getDictionary>;
};

const STORAGE_KEY = "cine_locale";

const LanguageContext = createContext<LanguageContextValue | null>(null);

function persistLocale(locale: Locale) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }

  document.cookie = `${LANGUAGE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = locale;
}

export function LanguageProvider({
  children,
  initialLocale
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(STORAGE_KEY);
    const normalizedStoredLocale =
      storedLocale === "en" ? "en" : storedLocale === "de" ? "de" : null;

    if (normalizedStoredLocale && normalizedStoredLocale !== locale) {
      persistLocale(normalizedStoredLocale);
      setLocaleState(normalizedStoredLocale);
      router.refresh();
      return;
    }

    persistLocale(locale);
  }, [locale, router]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale: nextLocale => {
        if (nextLocale === locale) {
          return;
        }

        persistLocale(nextLocale);
        setLocaleState(nextLocale);
        router.refresh();
      },
      dictionary: getDictionary(locale)
    }),
    [locale, router]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}

