import Link from "next/link";
import { Flame, Sparkles, Star, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { HorizontalMediaRow } from "@/components/sections/media-sections";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states/state-components";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getPopularMovies, getTrendingMovies } from "@/lib/tmdb/movies";
import { getPopularTv, getTrendingTv } from "@/lib/tmdb/tv";

export default async function HomePage() {
  try {
    const [trendingMovies, trendingTv, popularMovies, popularTv] = await Promise.all([
      getTrendingMovies(),
      getTrendingTv(),
      getPopularMovies(),
      getPopularTv()
    ]);

    const [safeTrendingMovies, safeTrendingTv, safePopularMovies, safePopularTv] =
      await Promise.all([
        filterMediaForViewerAge(trendingMovies),
        filterMediaForViewerAge(trendingTv),
        filterMediaForViewerAge(popularMovies),
        filterMediaForViewerAge(popularTv)
      ]);

    const featured = safeTrendingMovies[0];

    return (
      <AppShell>
        <div className="space-y-12">
          {featured ? (
            <section className="relative overflow-hidden rounded-[2rem] border border-border/50">
              <img
                src={featured.backdropUrl ?? featured.posterUrl ?? ""}
                alt={featured.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/20" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              <div className="relative z-10 flex min-h-[72vh] items-end p-8 sm:p-12">
                <div className="max-w-2xl space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                    <TrendingUp className="size-3.5" />
                    Trending diese Woche
                  </div>
                  <div className="space-y-3">
                    <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
                      Entdecke Filme und Serien mit echtem Daten- und KI-Stack.
                    </h1>
                    <p className="max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                      TMDB liefert Live-Daten fuer Trending, Popular, Detailseiten und Cast.
                      Supabase speichert deine Watchlist dauerhaft, OpenRouter ergaenzt
                      intelligente Empfehlungen.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="lg">
                      <Link href={`/movie/${featured.tmdbId}`}>Featured ansehen</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/search">Suche starten</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/discover">Kategorien entdecken</Link>
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        icon: <Flame className="size-4 text-orange-400" />,
                        title: "Trending",
                        value: `${safeTrendingMovies.length + safeTrendingTv.length} Live-Titel`
                      },
                      {
                        icon: <Star className="size-4 text-amber-400" />,
                        title: "Popular",
                        value: `${safePopularMovies.length + safePopularTv.length} kuratierte Treffer`
                      },
                      {
                        icon: <Sparkles className="size-4 text-primary" />,
                        title: "AI Assist",
                        value: "OpenRouter integriert"
                      }
                    ].map(item => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur"
                      >
                        <div className="mb-2">{item.icon}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm font-semibold">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <HorizontalMediaRow
            section={{
              id: "trending-movies",
              title: "Trending Filme",
              subtitle: "Diese Woche besonders gefragt",
              items: safeTrendingMovies,
              href: "/search?type=movie"
            }}
          />
          <HorizontalMediaRow
            section={{
              id: "trending-tv",
              title: "Trending Serien",
              subtitle: "Aktuell heiss diskutiert",
              items: safeTrendingTv,
              href: "/search?type=tv"
            }}
          />
          <HorizontalMediaRow
            section={{
              id: "popular-movies",
              title: "Beliebte Filme",
              subtitle: "Community-Favoriten mit hoher Reichweite",
              items: safePopularMovies,
              href: "/discover?mediaType=movie"
            }}
          />
          <HorizontalMediaRow
            section={{
              id: "popular-tv",
              title: "Beliebte Serien",
              subtitle: "Serien mit hoher Sichtbarkeit und Relevanz",
              items: safePopularTv,
              href: "/discover?mediaType=tv"
            }}
          />
        </div>
      </AppShell>
    );
  } catch (error) {
    return (
      <AppShell>
        <ErrorState
          title="Startseite konnte nicht geladen werden"
          description={error instanceof Error ? error.message : "Unbekannter Fehler"}
        />
      </AppShell>
    );
  }
}

