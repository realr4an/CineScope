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
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Datenschutzerklaerung</h1>
          <p className="text-sm text-muted-foreground">
            Hinweise zur Verarbeitung personenbezogener Daten auf dieser Website.
          </p>
        </div>

        <Section title="1. Verantwortlicher">
          <p>
            Duncan Scholle
            <br />
            Niederadener Strasse 135
            <br />
            44532 Luenen
            <br />
            Deutschland
          </p>
          <p>
            E-Mail: <a className="text-foreground underline underline-offset-4" href="mailto:realr4an@gmail.com">realr4an@gmail.com</a>
          </p>
        </Section>

        <Section title="2. Allgemeine Hinweise zur Datenverarbeitung">
          <p>
            Personenbezogene Daten werden auf dieser Website nur verarbeitet, soweit dies fuer den
            Betrieb der Website, die Bereitstellung ihrer Funktionen sowie fuer Authentifizierung,
            Watchlist, Jugendschutzfilter und KI-Funktionen erforderlich ist.
          </p>
          <p>
            Die Verarbeitung erfolgt insbesondere auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO,
            soweit die Daten fuer die Nutzung der angebotenen Funktionen erforderlich sind, sowie
            auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO fuer die technisch sichere Bereitstellung
            der Website.
          </p>
        </Section>

        <Section title="3. Hosting ueber Vercel">
          <p>
            Diese Website wird bei Vercel gehostet. Beim Aufruf der Website koennen durch den
            Hosting-Anbieter technisch erforderliche Verbindungsdaten verarbeitet werden,
            insbesondere IP-Adresse, Datum und Uhrzeit des Abrufs, aufgerufene URL,
            Browserinformationen sowie Fehler- und Logdaten.
          </p>
          <p>
            Die Verarbeitung erfolgt zur technisch sicheren Bereitstellung der Website sowie zur
            Stabilitaet und Sicherheit des Angebots auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
          </p>
        </Section>

        <Section title="4. Nutzung von Supabase fuer Authentifizierung und Datenbank">
          <p>
            Fuer Registrierung, Login, Passwort-Reset und die nutzerbezogene Speicherung von
            Watchlist-Daten, Feedback und Profildaten wird Supabase eingesetzt.
          </p>
          <p>
            Dabei koennen insbesondere E-Mail-Adresse, Authentifizierungsdaten,
            Session-Informationen, Watchlist-Eintraege, Bewertungen, Angaben zum Jugendschutz sowie
            Zeitstempel verarbeitet werden. Diese Verarbeitung ist erforderlich, um die von dir
            angeforderten Account- und App-Funktionen bereitzustellen und erfolgt auf Grundlage von
            Art. 6 Abs. 1 lit. b DSGVO.
          </p>
        </Section>

        <Section title="5. TMDB, externe Medieninhalte und Watch-Provider-Daten">
          <p>
            Inhalte wie Filmdaten, Seriendaten, Bilder, Besetzung, Trailer-Hinweise und
            Watch-Provider-Informationen werden ueber The Movie Database (TMDB) eingebunden.
          </p>
          <p>
            Beim Laden externer Bild- oder Mediendateien kann es dazu kommen, dass dein Browser eine
            direkte Verbindung zu Servern des jeweiligen Anbieters aufbaut. Dabei koennen
            insbesondere IP-Adresse, Browserdaten und technische Zugriffsinformationen verarbeitet
            werden.
          </p>
        </Section>

        <Section title="6. KI-Funktionen ueber OpenRouter">
          <p>
            Die KI-Funktionen dieser Website werden serverseitig ueber OpenRouter angebunden.
            Wenn du eine KI-Aktion ausloest, koennen deine Eingaben sowie die fuer die Anfrage
            benoetigten Kontextdaten, zum Beispiel ausgewaehlte Titel, Watchlist-Feedback oder
            Metadaten eines Mediums, an den KI-Dienst uebermittelt werden.
          </p>
          <p>
            Die Verarbeitung erfolgt ausschliesslich auf deine Anfrage hin zur Bereitstellung der
            gewuenschten KI-Funktion und damit auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.
          </p>
        </Section>

        <Section title="7. Cookies, lokale Speicherung und Jugendschutz">
          <p>
            Diese Website verwendet technisch erforderliche Cookies und aehnliche Speichermechanismen,
            insbesondere fuer Session-Handling, Login-Zustaende und den Jugendschutzfilter.
          </p>
          <p>
            Zusaetzlich werden bestimmte lokale Praeferenzen im Browser gespeichert, etwa die
            Landauswahl fuer Watch-Provider oder visuelle Einstellungen. Bei Gaesten kann ausserdem
            eine Altersangabe im Cookie gespeichert werden, damit altersbezogene Filter serverseitig
            angewendet werden koennen. Bei eingeloggten Nutzerinnen und Nutzern kann das Geburtsdatum
            zusaetzlich im Profil gespeichert werden.
          </p>
        </Section>

        <Section title="8. Speicherdauer">
          <p>
            Personenbezogene Daten werden nur so lange gespeichert, wie dies fuer die jeweiligen
            Zwecke erforderlich ist. Account- und Watchlist-Daten bleiben grundsaetzlich gespeichert,
            solange ein Nutzerkonto besteht oder eine Loeschung verlangt wird, soweit keine
            gesetzlichen Aufbewahrungspflichten entgegenstehen.
          </p>
        </Section>

        <Section title="9. Deine Rechte">
          <p>Du hast nach der DSGVO insbesondere folgende Rechte:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Auskunft ueber die verarbeiteten personenbezogenen Daten,</li>
            <li>Berichtigung unrichtiger Daten,</li>
            <li>Loeschung deiner Daten, soweit dem keine gesetzlichen Pflichten entgegenstehen,</li>
            <li>Einschraenkung der Verarbeitung,</li>
            <li>Widerspruch gegen bestimmte Verarbeitungen,</li>
            <li>Datenuebertragbarkeit.</li>
          </ul>
          <p>
            Zur Ausuebung dieser Rechte kannst du dich an <a className="text-foreground underline underline-offset-4" href="mailto:realr4an@gmail.com">realr4an@gmail.com</a> wenden.
          </p>
        </Section>

        <Section title="10. Beschwerderecht bei einer Aufsichtsbehoerde">
          <p>
            Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehoerde ueber die Verarbeitung
            deiner personenbezogenen Daten zu beschweren. Zustaendig ist insbesondere die
            Landesbeauftragte fuer Datenschutz und Informationsfreiheit Nordrhein-Westfalen.
          </p>
        </Section>

        <Section title="11. Keine Pflicht zur Bereitstellung bestimmter Daten">
          <p>
            Die Bereitstellung personenbezogener Daten ist grundsaetzlich freiwillig. Ohne bestimmte
            Daten, insbesondere bei Registrierung oder Login, koennen einzelne Funktionen wie
            Watchlist, gespeicherte Praeferenzen oder accountbezogene KI-Funktionen jedoch nicht
            genutzt werden.
          </p>
        </Section>

        <Section title="12. Stand dieser Datenschutzerklaerung">
          <p>Stand: 27. Maerz 2026</p>
        </Section>
      </div>
    </AppShell>
  );
}
