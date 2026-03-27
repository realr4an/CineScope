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
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{"Datenschutzerkl\u00e4rung"}</h1>
          <p className="text-sm text-muted-foreground">{"Hinweise zur Verarbeitung personenbezogener Daten auf dieser Website."}</p>
        </div>

        <Section title={"1. Verantwortlicher"}>
          <p>
            {"Duncan Scholle"}
            <br />
            {"Niederadener Stra\u00dfe 135"}
            <br />
            {"44532 L\u00fcnen"}
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
          <p>{"Personenbezogene Daten werden auf dieser Website nur verarbeitet, soweit dies f\u00fcr den Betrieb der Website, die Bereitstellung ihrer Funktionen sowie f\u00fcr Authentifizierung, Watchlist, Jugendschutzfilter und KI-Funktionen erforderlich ist."}</p>
          <p>{"Die Verarbeitung erfolgt insbesondere auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, soweit die Daten f\u00fcr die Nutzung der angebotenen Funktionen erforderlich sind, sowie auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO f\u00fcr die technisch sichere Bereitstellung der Website."}</p>
        </Section>

        <Section title={"3. Hosting \u00fcber Vercel"}>
          <p>{"Diese Website wird bei Vercel gehostet. Beim Aufruf der Website k\u00f6nnen durch den Hosting-Anbieter technisch erforderliche Verbindungsdaten verarbeitet werden, insbesondere IP-Adresse, Datum und Uhrzeit des Abrufs, aufgerufene URL, Browserinformationen sowie Fehler- und Logdaten."}</p>
          <p>{"Die Verarbeitung erfolgt zur technisch sicheren Bereitstellung der Website sowie zur Stabilit\u00e4t und Sicherheit des Angebots auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO."}</p>
        </Section>

        <Section title={"4. Nutzung von Supabase f\u00fcr Authentifizierung und Datenbank"}>
          <p>{"F\u00fcr Registrierung, Login, Passwort-Reset und die nutzerbezogene Speicherung von Watchlist-Daten, Feedback und Profildaten wird Supabase eingesetzt."}</p>
          <p>{"Dabei k\u00f6nnen insbesondere E-Mail-Adresse, Authentifizierungsdaten, Session-Informationen, Watchlist-Eintr\u00e4ge, Bewertungen, Angaben zum Jugendschutz sowie Zeitstempel verarbeitet werden. Diese Verarbeitung ist erforderlich, um die von dir angeforderten Account- und App-Funktionen bereitzustellen und erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO."}</p>
        </Section>

        <Section title={"5. TMDB, externe Medieninhalte und Watch-Provider-Daten"}>
          <p>{"Inhalte wie Filmdaten, Seriendaten, Bilder, Besetzung, Trailer-Hinweise und Watch-Provider-Informationen werden \u00fcber The Movie Database (TMDB) eingebunden."}</p>
          <p>{"Beim Laden externer Bild- oder Mediendateien kann es dazu kommen, dass dein Browser eine direkte Verbindung zu Servern des jeweiligen Anbieters aufbaut. Dabei k\u00f6nnen insbesondere IP-Adresse, Browserdaten und technische Zugriffsinformationen verarbeitet werden."}</p>
        </Section>

        <Section title={"6. KI-Funktionen \u00fcber OpenRouter"}>
          <p>{"Die KI-Funktionen dieser Website werden serverseitig \u00fcber OpenRouter angebunden. Wenn du eine KI-Aktion ausl\u00f6st, k\u00f6nnen deine Eingaben sowie die f\u00fcr die Anfrage ben\u00f6tigten Kontextdaten, zum Beispiel ausgew\u00e4hlte Titel, Watchlist-Feedback oder Metadaten eines Mediums, an den KI-Dienst \u00fcbermittelt werden."}</p>
          <p>{"Die Verarbeitung erfolgt ausschlie\u00dflich auf deine Anfrage hin zur Bereitstellung der gew\u00fcnschten KI-Funktion und damit auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO."}</p>
        </Section>

        <Section title={"7. Cookies, lokale Speicherung und Jugendschutz"}>
          <p>{"Diese Website verwendet technisch erforderliche Cookies und \u00e4hnliche Speichermechanismen, insbesondere f\u00fcr Session-Handling, Login-Zust\u00e4nde und den Jugendschutzfilter."}</p>
          <p>{"Zus\u00e4tzlich werden bestimmte lokale Pr\u00e4ferenzen im Browser gespeichert, etwa die L\u00e4nderauswahl f\u00fcr Watch-Provider oder visuelle Einstellungen. Bei G\u00e4sten kann au\u00dferdem eine Altersangabe im Cookie gespeichert werden, damit altersbezogene Filter serverseitig angewendet werden k\u00f6nnen. Bei eingeloggten Nutzerinnen und Nutzern kann das Geburtsdatum zus\u00e4tzlich im Profil gespeichert werden."}</p>
        </Section>

        <Section title={"8. Speicherdauer"}>
          <p>{"Personenbezogene Daten werden nur so lange gespeichert, wie dies f\u00fcr die jeweiligen Zwecke erforderlich ist. Account- und Watchlist-Daten bleiben grunds\u00e4tzlich gespeichert, solange ein Nutzerkonto besteht oder eine L\u00f6schung verlangt wird, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen."}</p>
        </Section>

        <Section title={"9. Deine Rechte"}>
          <p>{"Du hast nach der DSGVO insbesondere folgende Rechte:"}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>{"Auskunft \u00fcber die verarbeiteten personenbezogenen Daten,"}</li>
            <li>{"Berichtigung unrichtiger Daten,"}</li>
            <li>{"L\u00f6schung deiner Daten, soweit dem keine gesetzlichen Pflichten entgegenstehen,"}</li>
            <li>{"Einschr\u00e4nkung der Verarbeitung,"}</li>
            <li>{"Widerspruch gegen bestimmte Verarbeitungen,"}</li>
            <li>{"Daten\u00fcbertragbarkeit."}</li>
          </ul>
          <p>
            {"Zur Aus\u00fcbung dieser Rechte kannst du dich an "}
            <a className="text-foreground underline underline-offset-4" href="mailto:realr4an@gmail.com">
              {"realr4an@gmail.com"}
            </a>
            {" wenden."}
          </p>
        </Section>

        <Section title={"10. Beschwerderecht bei einer Aufsichtsbeh\u00f6rde"}>
          <p>{"Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbeh\u00f6rde \u00fcber die Verarbeitung deiner personenbezogenen Daten zu beschweren. Zust\u00e4ndig ist insbesondere die Landesbeauftragte f\u00fcr Datenschutz und Informationsfreiheit Nordrhein-Westfalen."}</p>
        </Section>

        <Section title={"11. Keine Pflicht zur Bereitstellung bestimmter Daten"}>
          <p>{"Die Bereitstellung personenbezogener Daten ist grunds\u00e4tzlich freiwillig. Ohne bestimmte Daten, insbesondere bei Registrierung oder Login, k\u00f6nnen einzelne Funktionen wie Watchlist, gespeicherte Pr\u00e4ferenzen oder accountbezogene KI-Funktionen jedoch nicht genutzt werden."}</p>
        </Section>

        <Section title={"12. Stand dieser Datenschutzerkl\u00e4rung"}>
          <p>{"Stand: 27. M\u00e4rz 2026"}</p>
        </Section>
      </div>
    </AppShell>
  );
}