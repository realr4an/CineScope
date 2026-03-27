import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { getPreferredLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPreferredLocale();

  return {
    title: locale === "en" ? "Privacy Policy | CineScope" : "Datenschutz | CineScope",
    description: locale === "en" ? "Privacy notice for CineScope" : "Datenschutzhinweise von CineScope"
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-border/50 bg-card/50 p-5 sm:p-6">
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export default async function DatenschutzPage() {
  const locale = await getPreferredLocale();
  const text =
    locale === "en"
      ? {
          title: "Privacy policy",
          subtitle: "Information about the processing of personal data on this website.",
          controllerTitle: "1. Controller",
          generalTitle: "2. General information on data processing",
          generalBody1:
            "Personal data is processed on this website only to the extent necessary for operating the website, providing its functions, and enabling authentication, watchlist features, age filtering, and AI functions.",
          generalBody2:
            "Processing is carried out in particular on the basis of Article 6(1)(b) GDPR where the data is required to use the requested functions, and on the basis of Article 6(1)(f) GDPR for the technically secure provision of the website.",
          hostingTitle: "3. Hosting via Vercel",
          hostingBody1:
            "This website is hosted by Vercel. When you access the website, technically necessary connection data may be processed by the hosting provider, in particular IP address, date and time of access, requested URL, browser information, as well as error and log data.",
          hostingBody2:
            "This processing is carried out for the technically secure provision of the website and for the stability and security of the service on the basis of Article 6(1)(f) GDPR.",
          supabaseTitle: "4. Use of Supabase for authentication and database storage",
          supabaseBody1:
            "Supabase is used for registration, login, password reset, and user-specific storage of watchlist data, feedback, and profile data.",
          supabaseBody2:
            "In particular, email address, authentication data, session information, watchlist entries, ratings, age-filtering information, and timestamps may be processed. This processing is required to provide the requested account and app features and is based on Article 6(1)(b) GDPR.",
          tmdbTitle: "5. TMDB, external media assets, and watch provider data",
          tmdbBody1:
            "Content such as movie data, series data, images, cast, trailer references, and watch provider information is integrated via The Movie Database (TMDB).",
          tmdbBody2:
            "When external image or media files are loaded, your browser may establish a direct connection to the respective provider's servers. In particular, IP address, browser data, and technical access information may be processed.",
          aiTitle: "6. AI features via OpenRouter",
          aiBody1:
            "The AI functions on this website are connected server-side through OpenRouter. When you trigger an AI action, your inputs as well as the context data required for the request, such as selected titles, watchlist feedback, or media metadata, may be transmitted to the AI service.",
          aiBody2:
            "Processing takes place exclusively at your request to provide the desired AI feature and is therefore based on Article 6(1)(b) GDPR.",
          cookiesTitle: "7. Cookies, local storage, and notice banner",
          cookiesBody1:
            "This website currently uses only technically necessary cookies and comparable storage mechanisms. These include session cookies for authentication via Supabase, cookies for language settings and age filtering, as well as browser-side storage for theme and region preferences.",
          cookiesBody2:
            "Separate tracking for advertising, marketing, or analytics purposes does not currently take place. No optional tracking or marketing cookies are currently set.",
          cookiesBody3:
            "A notice banner is displayed on the first visit to inform users about these technically necessary storage mechanisms. Acceptance of this notice is itself stored in a technically necessary cookie so the notice does not reappear on every page view.",
          cookiesBody4:
            "If additional non-essential cookies or comparable tracking technologies are introduced in the future, separate consent will be obtained before they are used.",
          retentionTitle: "8. Storage period",
          retentionBody:
            "Personal data is stored only for as long as necessary for the respective purposes. Account and watchlist data generally remain stored as long as a user account exists or deletion is requested, unless statutory retention obligations require otherwise.",
          rightsTitle: "9. Your rights",
          rightsLead: "Under the GDPR, you have the following rights in particular:",
          rights: [
            "Access to the personal data processed about you,",
            "Rectification of inaccurate data,",
            "Deletion of your data where no statutory obligations prevent this,",
            "Restriction of processing,",
            "Objection to certain processing activities,",
            "Data portability."
          ],
          rightsEndStart: "To exercise these rights, you can contact ",
          rightsEndEnd: ".",
          complaintTitle: "10. Right to complain to a supervisory authority",
          complaintBody:
            "You have the right to lodge a complaint with a data protection supervisory authority regarding the processing of your personal data. The competent authority is in particular the State Commissioner for Data Protection and Freedom of Information of North Rhine-Westphalia.",
          noDutyTitle: "11. No obligation to provide certain data",
          noDutyBody:
            "Providing personal data is generally voluntary. Without certain data, especially during registration or login, individual functions such as the watchlist, saved preferences, or account-related AI features cannot be used.",
          versionTitle: "12. Version of this privacy policy",
          versionBody: "Version: March 27, 2026",
          country: "Germany",
          emailLabel: "Email"
        }
      : {
          title: "Datenschutzerklärung",
          subtitle: "Hinweise zur Verarbeitung personenbezogener Daten auf dieser Website.",
          controllerTitle: "1. Verantwortlicher",
          generalTitle: "2. Allgemeine Hinweise zur Datenverarbeitung",
          generalBody1:
            "Personenbezogene Daten werden auf dieser Website nur verarbeitet, soweit dies für den Betrieb der Website, die Bereitstellung ihrer Funktionen sowie für Authentifizierung, Watchlist, Jugendschutzfilter und KI-Funktionen erforderlich ist.",
          generalBody2:
            "Die Verarbeitung erfolgt insbesondere auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO, soweit die Daten für die Nutzung der angebotenen Funktionen erforderlich sind, sowie auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO für die technisch sichere Bereitstellung der Website.",
          hostingTitle: "3. Hosting über Vercel",
          hostingBody1:
            "Diese Website wird bei Vercel gehostet. Beim Aufruf der Website können durch den Hosting-Anbieter technisch erforderliche Verbindungsdaten verarbeitet werden, insbesondere IP-Adresse, Datum und Uhrzeit des Abrufs, aufgerufene URL, Browserinformationen sowie Fehler- und Logdaten.",
          hostingBody2:
            "Die Verarbeitung erfolgt zur technisch sicheren Bereitstellung der Website sowie zur Stabilität und Sicherheit des Angebots auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.",
          supabaseTitle: "4. Nutzung von Supabase für Authentifizierung und Datenbank",
          supabaseBody1:
            "Für Registrierung, Login, Passwort-Reset und die nutzerbezogene Speicherung von Watchlist-Daten, Feedback und Profildaten wird Supabase eingesetzt.",
          supabaseBody2:
            "Dabei können insbesondere E-Mail-Adresse, Authentifizierungsdaten, Session-Informationen, Watchlist-Einträge, Bewertungen, Angaben zum Jugendschutz sowie Zeitstempel verarbeitet werden. Diese Verarbeitung ist erforderlich, um die von dir angeforderten Account- und App-Funktionen bereitzustellen und erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.",
          tmdbTitle: "5. TMDB, externe Medieninhalte und Watch-Provider-Daten",
          tmdbBody1:
            "Inhalte wie Filmdaten, Seriendaten, Bilder, Besetzung, Trailer-Hinweise und Watch-Provider-Informationen werden über The Movie Database (TMDB) eingebunden.",
          tmdbBody2:
            "Beim Laden externer Bild- oder Mediendateien kann es dazu kommen, dass dein Browser eine direkte Verbindung zu Servern des jeweiligen Anbieters aufbaut. Dabei können insbesondere IP-Adresse, Browserdaten und technische Zugriffsinformationen verarbeitet werden.",
          aiTitle: "6. KI-Funktionen über OpenRouter",
          aiBody1:
            "Die KI-Funktionen dieser Website werden serverseitig über OpenRouter angebunden. Wenn du eine KI-Aktion auslöst, können deine Eingaben sowie die für die Anfrage benötigten Kontextdaten, zum Beispiel ausgewählte Titel, Watchlist-Feedback oder Metadaten eines Mediums, an den KI-Dienst übermittelt werden.",
          aiBody2:
            "Die Verarbeitung erfolgt ausschließlich auf deine Anfrage hin zur Bereitstellung der gewünschten KI-Funktion und damit auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.",
          cookiesTitle: "7. Cookies, lokale Speicherung und Hinweisbanner",
          cookiesBody1:
            "Diese Website verwendet derzeit nur technisch erforderliche Cookies und vergleichbare Speichermechanismen. Dazu zählen insbesondere Session-Cookies für die Authentifizierung über Supabase, Cookies für Spracheinstellungen und den Jugendschutz sowie browserseitige Speicherungen für Theme- und Länderpräferenzen.",
          cookiesBody2:
            "Ein gesondertes Tracking zu Werbe-, Marketing- oder Analysezwecken findet derzeit nicht statt. Es werden aktuell keine optionalen Tracking- oder Marketing-Cookies gesetzt.",
          cookiesBody3:
            "Beim ersten Besuch wird ein Hinweisbanner angezeigt, das über diese technisch notwendigen Speicherungen informiert. Die Bestätigung dieses Hinweises wird selbst wiederum in einem technisch erforderlichen Cookie gespeichert, damit der Hinweis nicht bei jedem Seitenaufruf erneut erscheint.",
          cookiesBody4:
            "Sollten künftig zusätzliche, nicht technisch notwendige Cookies oder vergleichbare Tracking-Technologien eingebunden werden, wird vor deren Einsatz eine gesonderte Einwilligung eingeholt.",
          retentionTitle: "8. Speicherdauer",
          retentionBody:
            "Personenbezogene Daten werden nur so lange gespeichert, wie dies für die jeweiligen Zwecke erforderlich ist. Account- und Watchlist-Daten bleiben grundsätzlich gespeichert, solange ein Nutzerkonto besteht oder eine Löschung verlangt wird, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.",
          rightsTitle: "9. Deine Rechte",
          rightsLead: "Du hast nach der DSGVO insbesondere folgende Rechte:",
          rights: [
            "Auskunft über die verarbeiteten personenbezogenen Daten,",
            "Berichtigung unrichtiger Daten,",
            "Löschung deiner Daten, soweit dem keine gesetzlichen Pflichten entgegenstehen,",
            "Einschränkung der Verarbeitung,",
            "Widerspruch gegen bestimmte Verarbeitungen,",
            "Datenübertragbarkeit."
          ],
          rightsEndStart: "Zur Ausübung dieser Rechte kannst du dich an ",
          rightsEndEnd: " wenden.",
          complaintTitle: "10. Beschwerderecht bei einer Aufsichtsbehörde",
          complaintBody:
            "Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung deiner personenbezogenen Daten zu beschweren. Zuständig ist insbesondere die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen.",
          noDutyTitle: "11. Keine Pflicht zur Bereitstellung bestimmter Daten",
          noDutyBody:
            "Die Bereitstellung personenbezogener Daten ist grundsätzlich freiwillig. Ohne bestimmte Daten, insbesondere bei Registrierung oder Login, können einzelne Funktionen wie Watchlist, gespeicherte Präferenzen oder accountbezogene KI-Funktionen jedoch nicht genutzt werden.",
          versionTitle: "12. Stand dieser Datenschutzerklärung",
          versionBody: "Stand: 27. März 2026",
          country: "Deutschland",
          emailLabel: "E-Mail"
        };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{text.title}</h1>
          <p className="text-sm text-muted-foreground">{text.subtitle}</p>
        </div>

        <Section title={text.controllerTitle}>
          <p>
            {"Duncan Scholle"}
            <br />
            {"Niederadener Straße 135"}
            <br />
            {"44532 Lünen"}
            <br />
            {text.country}
          </p>
          <p>
            {`${text.emailLabel}: `}
            <a className="text-foreground underline underline-offset-4" href="mailto:realr4an@gmail.com">
              {"realr4an@gmail.com"}
            </a>
          </p>
        </Section>

        <Section title={text.generalTitle}>
          <p>{text.generalBody1}</p>
          <p>{text.generalBody2}</p>
        </Section>

        <Section title={text.hostingTitle}>
          <p>{text.hostingBody1}</p>
          <p>{text.hostingBody2}</p>
        </Section>

        <Section title={text.supabaseTitle}>
          <p>{text.supabaseBody1}</p>
          <p>{text.supabaseBody2}</p>
        </Section>

        <Section title={text.tmdbTitle}>
          <p>{text.tmdbBody1}</p>
          <p>{text.tmdbBody2}</p>
        </Section>

        <Section title={text.aiTitle}>
          <p>{text.aiBody1}</p>
          <p>{text.aiBody2}</p>
        </Section>

        <Section title={text.cookiesTitle}>
          <p>{text.cookiesBody1}</p>
          <p>{text.cookiesBody2}</p>
          <p>{text.cookiesBody3}</p>
          <p>{text.cookiesBody4}</p>
        </Section>

        <Section title={text.retentionTitle}>
          <p>{text.retentionBody}</p>
        </Section>

        <Section title={text.rightsTitle}>
          <p>{text.rightsLead}</p>
          <ul className="list-disc space-y-2 pl-5">
            {text.rights.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            {text.rightsEndStart}
            <a className="text-foreground underline underline-offset-4" href="mailto:realr4an@gmail.com">
              {"realr4an@gmail.com"}
            </a>
            {text.rightsEndEnd}
          </p>
        </Section>

        <Section title={text.complaintTitle}>
          <p>{text.complaintBody}</p>
        </Section>

        <Section title={text.noDutyTitle}>
          <p>{text.noDutyBody}</p>
        </Section>

        <Section title={text.versionTitle}>
          <p>{text.versionBody}</p>
        </Section>
      </div>
    </AppShell>
  );
}
