import { AppShell } from "@/components/layout/app-shell";
import { MediaGrid } from "@/components/sections/media-sections";
import { ErrorState } from "@/components/states/state-components";
import { AIPersonInsightsPanel } from "@/features/ai/person-insights-panel";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { formatDate } from "@/lib/format";
import { getServerDictionary } from "@/lib/i18n/server";
import { getPersonDetail } from "@/lib/tmdb/people";

type PersonPageProps = { params: Promise<{ id: string }> };

export default async function PersonPage({ params }: PersonPageProps) {
  const { dictionary } = await getServerDictionary();
  const isEnglish = dictionary.common.language === "Language";
  const text = isEnglish
    ? {
        noImage: "No image",
        fallbackDepartment: "Person",
        born: "Born",
        birthplace: "Birthplace",
        unknown: "Unknown",
        noBiography: "TMDB currently does not provide a biography for this person.",
        filmography: "Filmography",
        errorTitle: "Could not load person details"
      }
    : {
        noImage: "Kein Bild",
        fallbackDepartment: "Person",
        born: "Geboren",
        birthplace: "Geburtsort",
        unknown: "Unbekannt",
        noBiography: "Für diese Person liegt in TMDB aktuell keine Biografie vor.",
        filmography: "Filmografie",
        errorTitle: "Personendetails konnten nicht geladen werden"
      };

  const { id } = await params;

  try {
    const person = await getPersonDetail(Number(id));
    const safeCredits = await filterMediaForViewerAge(person.credits);

    return (
      <AppShell>
        <div className="space-y-8">
          <section className="grid gap-8 rounded-[2rem] border border-border/50 bg-card/50 p-8 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-3xl border border-border/50 bg-muted">
              {person.profileUrl ? <img src={person.profileUrl} alt={person.name} className="w-full" /> : <div className="flex aspect-[3/4] items-center justify-center text-muted-foreground">{text.noImage}</div>}
            </div>
            <div className="space-y-5">
              <div>
                <h1 className="text-4xl font-bold tracking-tight">{person.name}</h1>
                <p className="mt-2 text-sm uppercase tracking-[0.2em] text-primary">{person.knownForDepartment ?? text.fallbackDepartment}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">{text.born}</div>
                  <div className="mt-1 text-sm font-semibold">{formatDate(person.birthday)}</div>
                </div>
                <div className="rounded-2xl border border-border/50 bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">{text.birthplace}</div>
                  <div className="mt-1 text-sm font-semibold">{person.placeOfBirth ?? text.unknown}</div>
                </div>
              </div>
              <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground">{person.biography || text.noBiography}</p>
            </div>
          </section>

          <section className="space-y-4"><AIPersonInsightsPanel personId={person.id} /></section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">{text.filmography}</h2>
            <MediaGrid items={safeCredits} />
          </section>
        </div>
      </AppShell>
    );
  } catch (error) {
    return (
      <AppShell>
        <ErrorState title={text.errorTitle} description={error instanceof Error ? error.message : dictionary.common.unknownError} />
      </AppShell>
    );
  }
}
