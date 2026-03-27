"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { AgeGatePrompt } from "@/features/age-gate/age-gate-prompt";
import { WatchlistProvider } from "@/features/watchlist/watchlist-provider";
import type { AgeGateState } from "@/lib/age-gate";
import type { Viewer } from "@/types/auth";
import type { WatchlistItem } from "@/types/media";

interface AppProvidersProps {
  children: React.ReactNode;
  initialUser: Viewer | null;
  initialWatchlist: WatchlistItem[];
  initialAgeGate: AgeGateState;
}

export function AppProviders({
  children,
  initialUser,
  initialWatchlist,
  initialAgeGate
}: AppProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WatchlistProvider initialUser={initialUser} initialWatchlist={initialWatchlist}>
        {children}
        <AgeGatePrompt initialState={initialAgeGate} user={initialUser} />
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
    </ThemeProvider>
  );
}
