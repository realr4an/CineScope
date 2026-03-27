import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Datenschutz | CineScope",
  description: "Datenschutzhinweise von CineScope"
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-border/50 bg-card/50 p-5 sm:p-6">
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export default function DatenschutzPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{"Datenschutzerklärung"}</h1>
          <p className="text-sm text-muted-foreground">
            {"Hinweise zur Verarbeitung personenbezogener Daten auf dieser Website."}
          </p>
        </div>

        <Section title={"1. Verantwortlicher"}>
          <p>
            {"Duncan Scholle"}
            <br />
            {"Niederadener Straße 135"}
            <br />
            {"44532 Lünen"}
            <br />
            {"Deutschland"}
          </p>
          <p>
            {"E-Mail: "}
            <a className="text-foreground underline underline-offset-4" href="mailto:realr4an@gmail.com">
              {"realr4an@gmail.com"}
            </a>
          </p>
        </Section>

        <Section title={"2. Allgemeine Hinweise zur Datenverarbeitung"}>
          <p>
            {
              "Personenbezogene Daten werden auf dieser Website nur verarbeitet, soweit dies für den Betrieb der Website, die Bereitstellung ihrer Funktionen sowie für Authentifizierung, Watchlist, Jugendschutzfilter und KI-Funktionen erforderlich ist."
            }
          </p>
          <p>
            {
              "Die Verarbeitung erfolgt insbesondere auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, soweit die Daten für die Nutzung der angebotenen Funktionen erforderlich sind, sowie auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO für die technisch sichere Bereitstellung der Website."
            }
          </p>
        </Section>

        <Section title={"3. Hosting über Vercel"}>
          <p>
            {
              "Diese Website wird bei Vercel gehostet. Beim Aufruf der Website können durch den Hosting-Anbieter technisch erforderliche Verbindungsdaten verarbeitet werden, insbesondere IP-Adresse, Datum und Uhrzeit des Abrufs, aufgerufene URL, Browserinformationen sowie Fehler- und Logdaten."
            }
          </p>
          <p>
            {
              "Die Verarbeitung erfolgt zur technisch sicheren Bereitstellung der Website sowie zur Stabilität und Sicherheit des Angebots auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO."
            }
          </p>
        </Section>

        <Section title={"4. Nutzung von Supabase für Authentifizierung und Datenbank"}>
          <p>
            {
              "Für Registrierung, Login, Passwort-Reset und die nutzerbezogene Speicherung von Watchlist-Daten, Feedback und Profildaten wird Supabase eingesetzt."
            }
          </p>
          <p>
            {
              "Dabei können insbesondere E-Mail-Adresse, Authentifizierungsdaten, Session-Informationen, Watchlist-Einträge, Bewertungen, Angaben zum Jugendschutz sowie Zeitstempel verarbeitet werden. Diese Verarbeitung ist erforderlich, um die von dir angeforderten Account- und App-Funktionen bereitzustellen und erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO."
            }
          </p>
        </Section>

        <Section title={"5. TMDB, externe Medieninhalte und Watch-Provider-Daten"}>
          <p>
            {
              "Inhalte wie Filmdaten, Seriendaten, Bilder, Besetzung, Trailer-Hinweise und Watch-Provider-Informationen werden über The Movie Database (TMDB) eingebunden."
            }
          </p>
          <p>
            {
              "Beim Laden externer Bild- oder Mediendateien kann es dazu kommen, dass dein Browser eine direkte Verbindung zu Servern des jeweiligen Anbieters aufbaut. Dabei können insbesondere IP-Adresse, Browserdaten und technische Zugriffsinformationen verarbeitet werden."
            }
          </p>
        </Section>

        <Section title={"6. KI-Funktionen über OpenRouter"}>
          <p>
            {
              "Die KI-Funktionen dieser Website werden serverseitig über OpenRouter angebunden. Wenn du eine KI-Aktion auslöst, können deine Eingaben sowie die für die Anfrage benötigten Kontextdaten, zum Beispiel ausgewählte Titel, Watchlist-Feedback oder Metadaten eines Mediums, an den KI-Dienst übermittelt werden."
            }
          </p>
          <p>
            {
              "Die Verarbeitung erfolgt ausschließlich auf deine Anfrage hin zur Bereitstellung der gewünschten KI-Funktion und damit auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO."
            }
          </p>
        </Section>

        <Section title={"7. Cookies, lokale Speicherung und Hinweisbanner"}>
          <p>
            {
              "Diese Website verwendet derzeit nur technisch erforderliche Cookies und vergleichbare Speichermechanismen. Dazu zählen insbesondere Session-Cookies für die Authentifizierung über Supabase, Cookies für Spracheinstellungen und den Jugendschutz sowie browserseitige Speicherungen für Theme- und Länderpräferenzen."
            }
          </p>
          <p>
            {
              "Ein gesondertes Tracking zu Werbe-, Marketing- oder Analysezwecken findet derzeit nicht statt. Es werden aktuell keine optionalen Tracking- oder Marketing-Cookies gesetzt."
            }
          </p>
          <p>
            {
              "Beim ersten Besuch wird ein Hinweisbanner angezeigt, das über diese technisch notwendigen Speicherungen informiert. Die Bestätigung dieses Hinweises wird selbst wiederum in einem technisch erforderlichen Cookie gespeichert, damit der Hinweis nicht bei jedem Seitenaufruf erneut erscheint."
            }
          </p>
          <p>
            {
              "Sollten künftig zusätzliche, nicht technisch notwendige Cookies oder vergleichbare Tracking-Technologien eingebunden werden, wird vor deren Einsatz eine gesonderte Einwilligung eingeholt."
            }
          </p>
        </Section>

        <Section title={"8. Speicherdauer"}>
          <p>
            {
              "Personenbezogene Daten werden nur so lange gespeichert, wie dies für die jeweiligen Zwecke erforderlich ist. Account- und Watchlist-Daten bleiben grundsätzlich gespeichert, solange ein Nutzerkonto besteht oder eine Löschung verlangt wird, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen."
            }
          </p>
        </Section>

        <Section title={"9. Deine Rechte"}>
          <p>{"Du hast nach der DSGVO insbesondere folgende Rechte:"}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>{"Auskunft über die verarbeiteten personenbezogenen Daten,"}</li>
            <li>{"Berichtigung unrichtiger Daten,"}</li>
            <li>{"Löschung deiner Daten, soweit dem keine gesetzlichen Pflichten entgegenstehen,"}</li>
            <li>{"Einschränkung der Verarbeitung,"}</li>
            <li>{"Widerspruch gegen bestimmte Verarbeitungen,"}</li>
            <li>{"Datenübertragbarkeit."}</li>
          </ul>
          <p>
            {"Zur Ausübung dieser Rechte kannst du dich an "}
            <a className="text-foreground underline underline-offset-4" href="mailto:realr4an@gmail.com">
              {"realr4an@gmail.com"}
            </a>
            {" wenden."}
          </p>
        </Section>

        <Section title={"10. Beschwerderecht bei einer Aufsichtsbehörde"}>
          <p>
            {
              "Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung deiner personenbezogenen Daten zu beschweren. Zuständig ist insbesondere die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen."
            }
          </p>
        </Section>

        <Section title={"11. Keine Pflicht zur Bereitstellung bestimmter Daten"}>
          <p>
            {
              "Die Bereitstellung personenbezogener Daten ist grundsätzlich freiwillig. Ohne bestimmte Daten, insbesondere bei Registrierung oder Login, können einzelne Funktionen wie Watchlist, gespeicherte Präferenzen oder accountbezogene KI-Funktionen jedoch nicht genutzt werden."
            }
          </p>
        </Section>

        <Section title={"12. Stand dieser Datenschutzerklärung"}>
          <p>{"Stand: 27. März 2026"}</p>
        </Section>
      </div>
    </AppShell>
  );
}
