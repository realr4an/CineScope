import Link from "next/link";
import { Flame, Sparkles, Star, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { HorizontalMediaRow } from "@/components/sections/media-sections";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/states/state-components";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getPopularMovies, getTrendingMovies } from "@/lib/tmdb/movies";
import { getPopularTv, getTrendingTv } from "@/lib/tmdb/tv";

export default async function HomePage() {
  const { dictionary, locale } = await getServerDictionary();

  try {
    const [trendingMovies, trendingTv, popularMoviesResponse, popularTvResponse] = await Promise.all([
      getTrendingMovies(locale),
      getTrendingTv(locale),
      getPopularMovies(1, locale),
      getPopularTv(1, locale)
    ]);

    const [safeTrendingMovies, safeTrendingTv, safePopularMovies, safePopularTv] =
      await Promise.all([
        filterMediaForViewerAge(trendingMovies),
        filterMediaForViewerAge(trendingTv),
        filterMediaForViewerAge(popularMoviesResponse.items),
        filterMediaForViewerAge(popularTvResponse.items)
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
                    {dictionary.home.badge}
                  </div>
                  <div className="space-y-3">
                    <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
                      {dictionary.home.title}
                    </h1>
                    <p className="max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
                      {dictionary.home.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild size="lg">
                      <Link href={`/movie/${featured.tmdbId}`}>{dictionary.home.featured}</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/search">{dictionary.home.startSearch}</Link>
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        icon: <Flame className="size-4 text-orange-400" />,
                        title: dictionary.home.trending,
                        value: `${safeTrendingMovies.length + safeTrendingTv.length} ${dictionary.home.liveTitles}`
                      },
                      {
                        icon: <Star className="size-4 text-amber-400" />,
                        title: dictionary.home.popular,
                        value: `${safePopularMovies.length + safePopularTv.length} ${dictionary.home.curatedMatches}`
                      },
                      {
                        icon: <Sparkles className="size-4 text-primary" />,
                        title: dictionary.home.aiAssist,
                        value: `OpenRouter ${dictionary.home.integrated}`
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
              title: dictionary.home.trendingMovies,
              subtitle: dictionary.home.trendingMoviesSubtitle,
              items: safeTrendingMovies,
              href: "/search?type=movie"
            }}
          />
          <HorizontalMediaRow
            section={{
              id: "trending-tv",
              title: dictionary.home.trendingSeries,
              subtitle: dictionary.home.trendingSeriesSubtitle,
              items: safeTrendingTv,
              href: "/search?type=tv"
            }}
          />
          <HorizontalMediaRow
            section={{
              id: "popular-movies",
              title: dictionary.home.popularMovies,
              subtitle: dictionary.home.popularMoviesSubtitle,
              items: safePopularMovies,
              href: "/search?mediaType=movie"
            }}
          />
          <HorizontalMediaRow
            section={{
              id: "popular-tv",
              title: dictionary.home.popularSeries,
              subtitle: dictionary.home.popularSeriesSubtitle,
              items: safePopularTv,
              href: "/search?mediaType=tv"
            }}
          />
        </div>
      </AppShell>
    );
  } catch (error) {
    return (
      <AppShell>
        <ErrorState
          title={dictionary.home.errorTitle}
          description={error instanceof Error ? error.message : dictionary.common.unknownError}
        />
      </AppShell>
    );
  }
}
