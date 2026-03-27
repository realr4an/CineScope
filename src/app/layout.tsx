import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { getViewer, getWatchlistForViewer } from "@/lib/supabase/queries";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit"
});

export const metadata: Metadata = {
  title: "CineScope",
  description:
    "Film- und Serien-Explorer mit TMDB, Supabase Watchlist und OpenRouter-gestützten Empfehlungen."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [viewer, watchlist] = await Promise.all([getViewer(), getWatchlistForViewer()]);

  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable}`}>
        <AppProviders initialUser={viewer} initialWatchlist={watchlist}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
