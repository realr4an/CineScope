import { AppShell } from "@/components/layout/app-shell";
import { MediaGrid } from "@/components/sections/media-sections";
import { SectionHeader } from "@/components/shared/ui-components";
import { ErrorState } from "@/components/states/state-components";
import { DiscoverFilters } from "@/features/discover/discover-filters";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getDiscoverResults, getGenreMaps } from "@/lib/tmdb/discover";
import { discoverParamsSchema } from "@/lib/validators/media";

type DiscoverPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const rawSearchParams = await searchParams;
  const parsed = discoverParamsSchema.parse({
    mediaType: rawSearchParams.mediaType,
    genre: rawSearchParams.genre,
    year: rawSearchParams.year,
    rating: rawSearchParams.rating,
    sort: rawSearchParams.sort
  });

  try {
    const [{ movieList, tvList }, items] = await Promise.all([
      getGenreMaps(),
      getDiscoverResults(parsed)
    ]);
    const safeItems = await filterMediaForViewerAge(items);

    return (
      <AppShell>
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Kategorien</h1>
            <p className="text-muted-foreground">
              Finde Filme und Serien nach Kategorien mit Rating-, Jahr- und Sortierungsfiltern.
            </p>
          </div>

          <DiscoverFilters
            movieGenres={movieList}
            tvGenres={tvList}
            initial={parsed}
          />

          <div className="space-y-4">
            <SectionHeader
              title={parsed.mediaType === "movie" ? "Filme entdecken" : "Serien entdecken"}
              subtitle={`${safeItems.length} Treffer aus TMDB Discover`}
            />
            <MediaGrid items={safeItems} />
          </div>
        </div>
      </AppShell>
    );
  } catch (error) {
    return (
      <AppShell>
        <ErrorState
          title="Discover konnte nicht geladen werden"
          description={error instanceof Error ? error.message : "Unbekannter Fehler"}
        />
      </AppShell>
    );
  }
}

