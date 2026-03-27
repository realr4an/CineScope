"use client";

import { createContext, useContext, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { LANGUAGE_COOKIE, type Locale } from "@/lib/i18n/types";


type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dictionary: ReturnType<typeof getDictionary>;
  isSwitchingLocale: boolean;
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(STORAGE_KEY);
    const normalizedStoredLocale =
      storedLocale === "en" ? "en" : storedLocale === "de" ? "de" : null;

    if (normalizedStoredLocale && normalizedStoredLocale !== locale) {
      startTransition(() => {
        persistLocale(normalizedStoredLocale);
        setLocaleState(normalizedStoredLocale);
        router.refresh();
      });
      return;
    }

    persistLocale(locale);
  }, [locale, router]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale: nextLocale => {
        if (nextLocale === locale || isPending) {
          return;
        }

        startTransition(() => {
          persistLocale(nextLocale);
          setLocaleState(nextLocale);
          router.refresh();
        });
      },
      dictionary: getDictionary(locale),
      isSwitchingLocale: isPending
    }),
    [isPending, locale, router]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      {isPending ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/90 px-5 py-4 shadow-2xl">
            <RefreshCw className="size-5 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">
              {locale === "en" ? "Applying language..." : "Sprache wird angewendet..."}
            </span>
          </div>
        </div>
      ) : null}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
