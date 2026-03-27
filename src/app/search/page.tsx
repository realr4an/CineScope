import { AppShell } from "@/components/layout/app-shell";
import { MediaGrid } from "@/components/sections/media-sections";
import { SectionHeader } from "@/components/shared/ui-components";
import { EmptyState, ErrorState } from "@/components/states/state-components";
import { SearchForm } from "@/features/search/search-form";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getPopularMovies } from "@/lib/tmdb/movies";
import { searchMedia } from "@/lib/tmdb/search";
import { getPopularTv } from "@/lib/tmdb/tv";
import { searchParamsSchema } from "@/lib/validators/media";

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { dictionary } = await getServerDictionary();
  const rawSearchParams = await searchParams;
  const parsed = searchParamsSchema.parse({
    q: rawSearchParams.q,
    type: rawSearchParams.type,
    sort: rawSearchParams.sort
  });

  try {
    const results = parsed.q
      ? await searchMedia({ query: parsed.q, mediaType: parsed.type })
      : [];

    const safeResults = await filterMediaForViewerAge(results);

    const sortedResults = [...safeResults].sort((left, right) => {
      if (parsed.sort === "rating") {
        return right.rating - left.rating;
      }

      if (parsed.sort === "release_date") {
        return (right.releaseDate ?? "").localeCompare(left.releaseDate ?? "");
      }

      return right.voteCount - left.voteCount;
    });

    const discoveryItems =
      parsed.q.trim().length === 0
        ? await filterMediaForViewerAge([
            ...(await getPopularMovies()).slice(0, 6),
            ...(await getPopularTv()).slice(0, 6)
          ])
        : [];

    return (
      <AppShell>
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {dictionary.searchPage.title}
            </h1>
            <p className="text-muted-foreground">{dictionary.searchPage.description}</p>
          </div>

          <SearchForm
            initialQuery={parsed.q}
            initialType={parsed.type}
            initialSort={parsed.sort}
          />

          {parsed.q ? (
            sortedResults.length ? (
              <div className="space-y-4">
                <SectionHeader
                  title={`${sortedResults.length} ${dictionary.searchPage.results}`}
                  subtitle={`${dictionary.searchPage.matchesFor} "${parsed.q}"`}
                />
                <MediaGrid items={sortedResults} />
              </div>
            ) : (
              <EmptyState
                title={dictionary.searchPage.title === "Search" ? "No matches found" : "Keine Treffer gefunden"}
                description={
                  dictionary.searchPage.title === "Search"
                    ? `No matching movies or series were found for "${parsed.q}".`
                    : `Für "${parsed.q}" wurden keine passenden Filme oder Serien gefunden.`
                }
              />
            )
          ) : (
            <div className="space-y-4">
              <SectionHeader
                title={dictionary.searchPage.discoverTitle}
                subtitle={dictionary.searchPage.discoverSubtitle}
              />
              <MediaGrid items={discoveryItems} />
            </div>
          )}
        </div>
      </AppShell>
    );
  } catch (error) {
    return (
      <AppShell>
        <ErrorState
          title={dictionary.searchPage.errorTitle}
          description={error instanceof Error ? error.message : dictionary.common.unknownError}
        />
      </AppShell>
    );
  }
}
