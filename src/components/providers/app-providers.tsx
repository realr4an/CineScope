"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { AgeGatePrompt } from "@/features/age-gate/age-gate-prompt";
import { LanguageProvider } from "@/features/i18n/language-provider";
import { CookieNotice } from "@/features/legal/cookie-notice";
import { HorizontalScrollEnhancer } from "@/features/ui/horizontal-scroll-enhancer";
import { WatchlistProvider } from "@/features/watchlist/watchlist-provider";
import type { AgeGateState } from "@/lib/age-gate";
import type { Locale } from "@/lib/i18n/types";
import type { Viewer } from "@/types/auth";
import type { WatchlistItem } from "@/types/media";

interface AppProvidersProps {
  children: React.ReactNode;
  initialUser: Viewer | null;
  initialWatchlist: WatchlistItem[];
  initialAgeGate: AgeGateState;
  initialLocale: Locale;
}

export function AppProviders({
  children,
  initialUser,
  initialWatchlist,
  initialAgeGate,
  initialLocale
}: AppProvidersProps) {
  const pathname = usePathname() ?? "";
  const shouldShowAgeGate = pathname !== "/under-development" && !pathname.startsWith("/auth/");

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <LanguageProvider initialLocale={initialLocale}>
        <WatchlistProvider initialUser={initialUser} initialWatchlist={initialWatchlist}>
          {children}
          <HorizontalScrollEnhancer />
          <CookieNotice />
          {shouldShowAgeGate ? <AgeGatePrompt initialState={initialAgeGate} user={initialUser} /> : null}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "oklch(0.155 0.009 55)",
                border: "1px solid oklch(1 0 0 / 8%)",
                color: "oklch(0.93 0.01 80)"
              }
            }}
          />
        </WatchlistProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
