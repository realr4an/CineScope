import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Impressum | CineScope",
  description: "Impressum von CineScope"
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-border/50 bg-card/50 p-5 sm:p-6">
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function ImpressumPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Impressum</h1>
          <p className="text-sm text-muted-foreground">
            Angaben gemaess § 5 Digitale-Dienste-Gesetz (DDG)
          </p>
        </div>

        <Section title="Anbieter und Verantwortlicher">
          <p>
            Duncan Scholle
            <br />
            Niederadener Strasse 135
            <br />
            44532 Luenen
            <br />
            Deutschland
          </p>
        </Section>

        <Section title="Kontakt">
          <p>
            E-Mail: <a className="text-foreground underline underline-offset-4" href="mailto:realr4an@gmail.com">realr4an@gmail.com</a>
          </p>
          <p>
            Die Kontaktaufnahme erfolgt bevorzugt per E-Mail.
          </p>
        </Section>

        <Section title="Verantwortlich fuer redaktionelle Inhalte">
          <p>
            Duncan Scholle
            <br />
            Niederadener Strasse 135
            <br />
            44532 Luenen
            <br />
            Deutschland
          </p>
        </Section>

        <Section title="Haftung fuer Inhalte">
          <p>
            Die Inhalte dieser Website wurden mit groesstmoeglicher Sorgfalt erstellt. Fuer die
            Richtigkeit, Vollstaendigkeit und Aktualitaet der Inhalte wird jedoch keine Gewaehr
            uebernommen.
          </p>
        </Section>

        <Section title="Haftung fuer Links">
          <p>
            Diese Website enthaelt Links zu externen Websites Dritter, auf deren Inhalte kein
            Einfluss besteht. Fuer diese fremden Inhalte wird daher keine Gewaehr uebernommen. Fuer
            die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der
            Seiten verantwortlich.
          </p>
        </Section>
      </div>
    </AppShell>
  );
}
