# CineScope

CineScope ist eine produktionsnahe Film- und Serien-Explorer-Web-App auf Basis von TMDB, Supabase und OpenRouter. Die App verbindet klassische Discovery-Features wie Suche, Trends, Popular-Listen und Detailseiten mit einer persistenten Watchlist, Authentifizierung, Jugendschutz-Logik und einem integrierten KI-Layer für Empfehlungen, Einordnung und Auswahlhilfe.

Produktiver Link: `https://cine-scope-realr4an.vercel.app/`

Hinweis: Alle Pfadverweise in dieser README sind als relative Repository-Verweise formuliert und passen zum aktuellen Stand des `main`-Branches.

## Kurzbeschreibung und gewähltes Thema

- Thema: `Film- & Serien-Explorer`
- Ziel: Nutzer:innen sollen Filme und Serien suchen, entdecken, filtern, vergleichen, merken und mit KI-Unterstützung besser einordnen können.
- Datenquellen: TMDB für Medieninhalte und Watch-Provider, Supabase für Auth und Persistenz, OpenRouter für KI-Features.
- Ausrichtung: Die App ist nicht als Demo-Klickstrecke gebaut, sondern als erweiterbare Fullstack-Anwendung mit klarer Trennung zwischen UI, Services, Validierung, Persistenz und KI-Routen.

## Implementierte Features

### Kernfunktionen

- Startseite mit `Trending Movies`, `Trending TV`, `Popular Movies` und `Popular TV`
- Suchseite mit Textsuche, Filtern und paginierten Ergebnissen
- Genre-basierte Entdeckungsseite mit eigener Filterlogik
- Detailseiten für Filme und Serien mit:
  - KI-generierter Kurzüberblick
  - Cast
  - Trailer
  - Similar Titles
  - erweiterten Metadaten
  - Sprachen
  - Altersfreigabe
  - Streaming-Verfügbarkeit
- Personenseiten mit Filmografie und KI-Einordnung

### Nutzerkonto und Persistenz

- Supabase Auth mit Login, Signup, Logout und Passwort-Reset
- persistente Watchlist pro Nutzer:in
- Watchlist-Feedback pro Titel:
  - `gesehen`
  - `gefällt`
  - `gefällt nicht`
- gespeicherte Präferenzen wie bevorzugte Region
- Account-Einstellungen für persönliche Angaben und jugendschutzrelevante Daten
- gespeicherte KI-Chat-Sessions

### KI-Features

- KI-Assistent für freie Medienanfragen und Auswahlhilfe
- Titelvergleich
- geführte Auswahlhilfe auf Basis von Stimmung, Zeitbudget und Anlass
- KI-Zusammenfassungen auf Detailseiten
- KI-Vibe-Tags und Content-Hinweise
- KI-gestützte Watchlist-Priorisierung und Gruppierung
- KI-klassifiziertes Feedback mit Speicherung nur bei konstruktiven Einträgen

### UX und Produktqualität

- responsives Layout für Desktop und Mobile
- Dark Mode
- Lade-, Fehler- und Leerzustände
- klickbare KI-Empfehlungen
- horizontale Content-Bereiche mit Maus- und Touch-Nutzung
- Where-to-watch mit Länderwahl
- Jugendschutz-Gate mit Altersfilterung

## Architekturübersicht

```mermaid
flowchart TD
    U[Benutzer:in] --> N[Next.js App Router UI]
    N --> P[Feature-Komponenten]
    P --> T[TMDB Service Layer]
    P --> S[Supabase Layer]
    P --> A[AI API Routes]

    T --> TMDB[TMDB API]
    S --> SB[(Supabase Auth + DB)]
    A --> OR[OpenRouter]

    A --> G[Guardrails<br/>Zod · Prompt-Checks · Rate Limits]
    S --> RLS[RLS Policies]
    N --> M[Middleware / Session Refresh]

    G --> OR
    M --> SB
```

## Projektstruktur

```text
src/
  app/
    page.tsx
    search/page.tsx
    discover/page.tsx
    collections/[kind]/page.tsx
    movie/[id]/page.tsx
    tv/[id]/page.tsx
    person/[id]/page.tsx
    watchlist/page.tsx
    ai/page.tsx
    account/page.tsx
    feedback/page.tsx
    admin/feedback/page.tsx
    auth/*
    api/*
  components/
    layout/
    cards/
    sections/
    states/
    shared/
    ui/
  features/
    ai/
    ai-chat/
    auth/
    discover/
    feedback/
    search/
    watch-providers/
    watchlist/
  lib/
    ai/
    env.ts
    i18n/
    security/
    supabase/
    tmdb/
    validators/
  types/
middleware.ts
supabase/schema.sql
```

## Verwendete Technologien

### Laufzeit, Framework und Sprache

| Bereich | Technologie | Version / Stand | Zweck |
| --- | --- | --- | --- |
| Framework | Next.js | `15.5.x` | Fullstack-Framework, App Router, SSR, API Routes |
| UI Runtime | React | `19.2.x` | Komponentenmodell |
| Sprache | TypeScript | `5.9.x` | strikte Typisierung |
| Styling | Tailwind CSS | `4.1.x` | Utility-first Styling |
| Motion | Framer Motion | `12.x` | Übergänge und Animationen |
| Icons | lucide-react | `0.453.x` | konsistente Icon-Sprache |
| Theme | next-themes | `0.4.x` | Light-/Dark-Mode |
| Forms | react-hook-form + zod | `7.x` / `4.x` | Formzustand und Validierung |
| UI Utilities | class-variance-authority, clsx, tailwind-merge | aktuell | Varianten, Klassenlogik |
| Notifications | sonner | `2.x` | Toasts |

### Daten, Auth und Persistenz

| Bereich | Technologie | Zweck |
| --- | --- | --- |
| Auth | Supabase Auth | Login, Signup, Passwort-Reset, Session-Verwaltung |
| Datenbank | Supabase Postgres | Watchlist, Profile, Präferenzen, Chat-Sessions, Feedback |
| SSR Auth | `@supabase/ssr` | Server- und Middleware-kompatibler Session-Zugriff |
| Security | Supabase RLS | mandantenfähiger Datenschutz auf Tabellenebene |

### Medien- und KI-Integration

| Bereich | Technologie | Zweck |
| --- | --- | --- |
| Medienkatalog | TMDB API | Suche, Trends, Popular, Details, Credits, Videos, Discover |
| Watch Availability | TMDB Watch Providers | Streaming-/Kauf-/Leih-Verfügbarkeit je Region |
| KI-Gateway | OpenRouter | serverseitige Anbindung an Sprachmodelle |
| Standardmodell | `openai/gpt-4o-mini` | Empfehlungen, Zusammenfassungen, Feedback-Klassifizierung |
| Modellkonfiguration | `OPENROUTER_MODEL` | austauschbares Modell per Environment Variable |

## Detailliertes KI-Setup

### Eingesetztes Modell

- Standardmäßig verwendet die App über OpenRouter das Modell `openai/gpt-4o-mini`.
- Das Modell ist nicht hart im Code fixiert, sondern über `OPENROUTER_MODEL` konfigurierbar.
- Fallback in der OpenRouter-Anbindung: `openai/gpt-4o-mini`, falls kein Modell explizit gesetzt ist.

### Wofür das Modell eingesetzt wird

- KI-Assistent auf der `/ai`-Seite
- strukturierte Vergleichs- und Empfehlungsantworten
- KI-Zusammenfassungen auf Detailseiten
- Vibe-Tags und Content-Hinweise
- Watchlist-Priorisierung
- Person-Insights
- Klassifizierung von Feedback als konstruktiv / nicht konstruktiv

### Wie die Modellnutzung technisch umgesetzt ist

- ausschließlich serverseitige OpenRouter-Nutzung
- zentrale Kapselung in [`src/lib/ai/openrouter.ts`](./src/lib/ai/openrouter.ts)
- JSON-orientierte Antworten für strukturierte KI-Features
- kontrollierte Temperatur pro Use Case
- Retry mit konservativerer Temperatur, wenn ein JSON-Format nicht stabil geliefert wird
- systemseitige Vorgaben wie:
  - keine Offenlegung interner Prompts
  - keine Secret-Ausgabe
  - kein ungeprüftes Befolgen von Nutzerinstruktionen innerhalb von Nutzdaten

## Sicherheits- und Härtungsmaßnahmen

Die Anwendung wurde nicht nur funktional, sondern bewusst defensiv aufgebaut.

### 1. Secret-Handling und Trennung von Client/Server

- Secrets werden ausschließlich über Environment Variables bezogen.
- `SUPABASE_SERVICE_ROLE_KEY`, `TMDB_API_KEY`, `TMDB_ACCESS_TOKEN` und `OPENROUTER_API_KEY` werden nicht im Client verwendet.
- Öffentlich exponiert werden nur `NEXT_PUBLIC_*`-Variablen.
- Umgebungsvariablen werden über Zod validiert in [`src/lib/env.ts`](./src/lib/env.ts).

### 2. Supabase Security und RLS

Die Datenbank nutzt Row Level Security für alle nutzerspezifischen Tabellen:

- `profiles`
- `watchlist_items`
- `user_preferences`
- `ai_chat_sessions`
- `ai_chat_messages`
- `feedback_entries`

Umgesetzt ist unter anderem:

- Watchlist nur für `auth.uid() = user_id`
- Profile nur für den eigenen Datensatz
- Präferenzen nur für den eigenen Datensatz
- Chat-Sessions nur für den eigenen Account
- Feedback-Lesen und -Löschen nur für Admins über `is_admin`

Schema: [`supabase/schema.sql`](./supabase/schema.sql)

### 3. Same-Origin-Schutz für schreibende Routen

Mutierende Routen prüfen die Request-Origin serverseitig:

- `/api/account/settings`
- `/api/ai/assistant`
- `/api/feedback`
- `/api/admin/feedback/[id]`
- Legacy Pages APIs für KI-Zusammenfassung und Empfehlungen

Die Prüfung liegt in [`src/lib/security/request.ts`](./src/lib/security/request.ts).

### 4. Rate Limiting

Empfindliche Routen haben IP-basierte Rate Limits:

- Feedback-Submission
- Account-Settings
- KI-Assistent
- KI-Empfehlungen
- KI-Zusammenfassungen
- Admin-Feedback-Löschung

Aktueller technischer Stand:

- leichtgewichtiges In-Memory-Bucket-Limit in [`src/lib/security/rate-limit.ts`](./src/lib/security/rate-limit.ts)
- gut für lokale Entwicklung und Basisschutz
- für horizontale Skalierung wäre ein zentraler Store wie Redis der nächste saubere Schritt

### 5. Input-Validierung

- Request-Payloads werden mit Zod validiert.
- Environment Variables werden mit Zod validiert.
- KI-JSON-Antworten werden gegen Schemas geprüft, bevor sie in die UI gelangen.
- Benutzerkritische Felder wie Geburtsdatum, Feedback, Watchlist-Feedback und AI-Inputs werden nicht ungeprüft durchgereicht.

### 6. Prompt-Injection-Schutz und AI Guardrails

Die App enthält explizite Schutzlogik gegen missbräuchliche KI-Eingaben:

- Regex-basierte Erkennung starker und schwacher Prompt-Injection-Muster
- Blockade sensibler Daten-Exfiltration wie:
  - Token- oder Secret-Leaks
  - Aufforderungen zum Dump von Nutzer- oder Profildaten
  - Aufforderungen, Sicherheitsregeln zu umgehen
- Sanitizing von Chat-Eingaben für den Assistenten
- Begrenzung der Textlänge für sicherheitsrelevante Prüfpfade

Relevante Dateien:

- [`src/lib/security/prompt-injection.ts`](./src/lib/security/prompt-injection.ts)
- [`src/lib/ai/assistant-guard.ts`](./src/lib/ai/assistant-guard.ts)

### 7. Feedback-Härtung

- Feedback wird nicht blind gespeichert.
- Vor dem Persistieren wird es per KI als konstruktiv / nicht konstruktiv klassifiziert.
- Missbräuchliche oder unproduktive Einträge werden verworfen.
- Gespeicherte Feedback-Einträge werden als `ai_checked`, `is_constructive` und `ai_model` markiert.
- Feedback kann nur im Admin-Bereich vollständig eingesehen und gelöscht werden.

### 8. Auth- und Session-Härtung

- Supabase SSR wird im Server-Kontext und in der Middleware verwendet.
- Die Middleware aktualisiert Sessions serverseitig.
- Passwort-Reset läuft über Supabase und den Confirm-Step der App.
- Geschützte Seiten wie Watchlist, Account oder Admin-Feedback leiten korrekt um.

Middleware: [`middleware.ts`](./middleware.ts)

### 9. Jugendschutz und Altersfilter

- Besucher:innen ohne Konto geben beim ersten Besuch ein Geburtsdatum an.
- Die Angabe wird in einem Cookie gespeichert.
- Bei eingeloggten Nutzer:innen wird das Geburtsdatum zusätzlich im Profil gespeichert.
- Listen- und Detailseiten filtern Inhalte anhand der Altersfreigabe.
- Für Filme wird bevorzugt die deutsche TMDB-Freigabe genutzt, mit Fallback auf US, wenn DE fehlt.
- Titel ohne belastbare Freigabe werden konservativ behandelt.

## Datenmodell

### `profiles`

- `id`
- `display_name`
- `avatar_url`
- `birth_date`
- `is_admin`
- `created_at`
- `updated_at`

### `watchlist_items`

- `id`
- `user_id`
- `tmdb_id`
- `media_type`
- `title`
- `poster_path`
- `backdrop_path`
- `release_date`
- `vote_average`
- `watched`
- `liked`
- `created_at`

### `user_preferences`

- `id`
- `user_id`
- `favorite_genres`
- `preferred_media_types`
- `preferred_region`
- `updated_at`

### `ai_chat_sessions`

- `id`
- `user_id`
- `title`
- `created_at`

### `ai_chat_messages`

- `id`
- `session_id`
- `role`
- `content`
- `created_at`

### `feedback_entries`

- `id`
- `user_id`
- `email`
- `display_name`
- `category`
- `message`
- `page_path`
- `moderation_summary`
- `ai_checked`
- `is_constructive`
- `ai_model`
- `created_at`

## Lokales Setup

### Voraussetzungen

- Node.js 20+
- npm 10+
- Supabase-Projekt
- TMDB API Key oder TMDB Access Token
- OpenRouter API Key

### Installation

1. Repository klonen
2. Abhängigkeiten installieren

```bash
npm install
```

3. `.env.local` anlegen

```bash
cp .env.example .env.local
```

4. Supabase-Schema ausführen

```sql
-- Datei: supabase/schema.sql
```

5. Entwicklungsserver starten

```bash
npm run dev
```

6. Typecheck und Build prüfen

```bash
npm run check
npm run build
```

## Environment Variables

| Variable | Pflicht | Sichtbarkeit | Zweck |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ja | public | Supabase Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ja | public | öffentlicher Supabase Client-Key |
| `SUPABASE_SERVICE_ROLE_KEY` | ja | server-only | Admin-Zugriffe für serverseitige Operationen |
| `TMDB_API_KEY` | ja* | server-only | TMDB API Zugriff |
| `TMDB_ACCESS_TOKEN` | ja* | server-only | Alternative zu `TMDB_API_KEY` |
| `OPENROUTER_API_KEY` | ja | server-only | OpenRouter Zugriff |
| `OPENROUTER_MODEL` | nein | server-only | Modellwahl, standardmäßig `openai/gpt-4o-mini` |
| `NEXT_PUBLIC_APP_URL` | empfohlen | public | Basis-URL für Redirects und produktive Links |

\* Es reicht `TMDB_API_KEY` oder `TMDB_ACCESS_TOKEN`.

## TMDB-Integration

Abgedeckt sind:

- Trending Movies
- Trending TV
- Popular Movies
- Popular TV
- Search
- Movie Details
- TV Details
- Credits / Cast
- Videos / Trailer
- Similar Titles
- Discover by Genre
- Person Details und Combined Credits
- Watch Providers je Film und Serie
- Available Regions für den Country Selector

## Deployment

Zielplattform: Vercel

Aktueller produktiver Stand:

- Struktur auf Next.js + Vercel ausgelegt
- produktiver Link: `https://cine-scope-realr4an.vercel.app/`
- alle produktiven Environment Variables müssen im Vercel-Projekt gesetzt sein

## Agentic Engineering Dokumentation

Dieses Projekt wurde in einem bewusst mehrstufigen agentischen Workflow umgesetzt.

### Eingesetzter Workflow

1. Mit ChatGPT wurde zunächst ein Arbeitsplan für zwei spezialisierte AI-Agents erstellt.
2. Auf Basis dieses Plans wurde Manus für einen ersten Frontend-Stand eingesetzt.
3. Anschließend wurde ein darauf aufbauender Prompt für Codex formuliert, mit Fokus auf:
   - Fullstack-Integration
   - Service Layer
   - Auth und Persistenz
   - KI-Routen
   - Edge Cases
   - Deployment-Reife
4. Danach wurde iterativ mit Codex gearbeitet, inklusive laufendem menschlichem Feedback und Korrekturen.

### Rollen der Agenten

- ChatGPT:
  - Planung der Agentenaufteilung
  - Strukturierung der Arbeitsstrategie
  - Vorbereitung der Prompts
- Manus:
  - visuelle Grundlage
  - erste Layouts
  - erste Komponenten- und UX-Struktur
- Codex:
  - technische Integration in Next.js
  - Supabase-Anbindung
  - TMDB-Service-Layer
  - OpenRouter-Anbindung
  - Sicherheits- und Härtungsmaßnahmen
  - Fehlerbehebung
  - Deployment-Polish

### Was manuell entschieden und überprüft wurde

- welche UI-Teile aus dem ersten Frontend-Stand beibehalten werden und welche bewusst neu gebaut oder refaktoriert werden
- dass der Ziel-Stack konsequent auf Next.js App Router, TypeScript, Tailwind, Supabase, TMDB und OpenRouter ausgerichtet bleibt
- welche Features produktrelevant priorisiert werden und welche bewusst nicht weiter ausgebaut werden
- wie Services, Features, Presentational Components und Persistenz logisch getrennt werden
- wo strukturierte KI-Antworten robuster sind und wo dem Assistenten bewusst mehr Freiheit gegeben wird
- wie Guardrails gegen Prompt Injection, Datenexfiltration und Missbrauch gesetzt werden, ohne die Produktnutzung unnötig zu verschlechtern
- wie Nutzerfeedback, Altersfilter, Watchlist-Signale und persönliche Präferenzen sinnvoll zusammenspielen
- welche Fehlerbilder iterativ nachgeschärft wurden, zum Beispiel fehlerhafte Verlinkungen, unpassende KI-Treffer, fragile Follow-ups oder uneinheitliche UI-Texte

### Eigener Steuerungsanteil

Die zentralen Entscheidungen dieses Projekts wurden nicht an Agenten delegiert, sondern aktiv gesteuert und bewertet. Dazu gehörten insbesondere:

- die Auswahl und Schärfung der Agentenprompts
- die Entscheidung, welche generierten Vorschläge übernommen, verworfen oder technisch neu umgesetzt werden
- die Definition der Sicherheitsgrenzen für API-Routen, KI-Nutzung und Datenzugriffe
- die Priorisierung von Qualität, Wartbarkeit und Interview-Erklärbarkeit vor maximaler Feature-Menge
- die laufende Korrektur von Produktdetails auf Basis echter Nutzung, Fehlverhalten und UX-Beobachtungen

## Trade-offs

- Das Rate Limiting ist aktuell bewusst einfach gehalten und nutzt In-Memory-Buckets statt eines zentralen externen Stores.
- Der KI-Layer ist absichtlich serverseitig und guarded aufgebaut; das reduziert Risiko, macht den Chat aber strukturierter als ein völlig freies Chatfenster.
- Die App priorisiert saubere Integrationsfähigkeit und Produktqualität vor maximaler Feature-Breite.

## Nächste sinnvolle Ausbaustufen

- zentrales Rate Limiting mit Redis oder Upstash
- automatisierte Tests für Mapper, Zod-Schemas und Security-Helfer
- tiefere Observability für produktive Fehlerpfade
- noch feinere Disambiguierung bei gleichnamigen Titeln im KI-Assistenten
- stärker personalisierte Home-Recommendations auf Basis von Watchlist-Signalen
