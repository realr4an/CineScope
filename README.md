# CineScope

CineScope ist eine produktionsnahe Film- und Serien-Explorer-Web-App. Die App kombiniert TMDB für Live-Inhalte, Supabase für Auth und persistente Watchlist sowie OpenRouter für einen zusammenhängenden AI Layer für Medien-Discovery.

## README-Pflichtinhalte

### 1) Kurzbeschreibung des Projekts und gewähltes Thema

- Thema: `Film- & Serien-Explorer` (Thema C)
- Ziel: Eine moderne Discovery-App, in der Nutzer:innen Filme und Serien suchen, vergleichen, entdecken und in einer persistenten Watchlist organisieren können.
- Datenquellen und Kernsysteme: TMDB für Medieninhalte, Supabase für Auth + Persistenz, OpenRouter für KI-Features.

### 2) Anleitung zum lokalen Setup

Voraussetzungen:

- Node.js 20+
- npm 10+
- Supabase-Projekt
- TMDB-API-Zugang
- OpenRouter-API-Key

Schritte:

1. Repository klonen und in das Projektverzeichnis wechseln.
2. Abhängigkeiten installieren:

```bash
npm install
```

3. Umgebungsvariablen einrichten:

```bash
cp .env.example .env.local
```

4. `.env.local` mit echten Werten füllen:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
TMDB_ACCESS_TOKEN=
OPENROUTER_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
OPENROUTER_MODEL=openai/gpt-4o-mini
```

5. Datenbankschema ausführen (Supabase SQL Editor):

```sql
-- Datei: supabase/schema.sql
```

6. Entwicklungsserver starten:

```bash
npm run dev
```

7. Build- und Typprüfung:

```bash
npm run check
npm run build
```

### 3) Beschreibung der implementierten Features

Kernfunktionen:

- Startseite mit `Trending Movies`, `Trending TV`, `Popular Movies`, `Popular TV`
- Suche mit Filtern für Filme und Serien
- Genre-basierte Discover-Seite mit eigener Filterlogik
- Detailseiten für Filme und Serien inkl. Cast, Trailer, Similar Titles und erweiterten Metadaten
- Personenseiten mit Filmografie
- `Where to watch` pro Titel mit Länderauswahl und gruppierten TMDB-Watch-Providern

Nutzerkonto und Persistenz:

- Supabase Auth: Login, Signup, Logout, Passwort-Reset
- Persistente Watchlist pro User mit RLS-Schutz
- Watchlist-Status je Titel: `gesehen`, `gefällt`, `gefällt nicht`
- Account- und Präferenzdaten (z. B. bevorzugte Region/Jugendschutzrelevante Angaben)
- Feedback-System mit Admin-Postfach

KI-Features:

- KI-Assistent für Empfehlungen und geführte Auswahl
- Titelvergleich
- Zeit- und situationsbasierte Vorschläge
- KI-gestützte Zusammenfassungen, Vibe-Tags und Content-Hinweise (UI-kontextbezogen)
- KI-gestützte Watchlist-Priorisierung/Gruppierung
- KI-geprüfte Feedback-Klassifizierung (`konstruktiv ja/nein`) vor dem Speichern

UI/UX und Produktqualität:

- Responsives Layout für Mobile und Desktop
- Dark Mode
- Loading-, Empty- und Error-States
- Interaktive Listen, Filter, horizontale Card-Bereiche und klickbare Recommendation-Links
- Altersabfrage/Jugendschutzfilter für nicht eingeloggte und eingeloggte Nutzung

## AI Layer

Die KI ist bewusst nicht als lose Sammlung kleiner Chatbots umgesetzt, sondern als konsistente Schicht über der App.

### Kernfeatures

- Titelvergleich
- `Was zuerst schauen?` auf der Watchlist
- Assistenzmodus zur Auswahlhilfe

### Zusätzliche KI-Features

- Zeitbasierte Vorschläge
- Eltern-/Freunde-/Date-Night-Helfer
- Vibe-Tags auf Detailseiten
- spoilerfreie Content-Warning light
- Person-Insights auf Personenseiten
- spoilerfreie KI-Zusammenfassung auf Detailseiten

### Wo die KI lebt

- Detailseiten:
  Vibe-Tags, Content-Warning light, persönliche Passung, Titelvergleich
- Watchlist:
  Priorisierung mehrerer Titel mit optionalem Zeit- oder Situationskontext
- AI-Seite:
  fokussierter Assistenzmodus und eigenständiges Compare-Modul
- Personenseiten:
  kurze KI-Einordnung, wofür eine Person bekannt ist

### Welche Inputs die KI nutzt

- TMDB-Titeldaten wie Titel, Overview, Genres, Laufzeit, Staffeln, Episoden, Cast und Release-Datum
- Watchlist-Feedback wie `gesehen`, `gefällt`, `gefällt nicht`
- Nutzerkontext wie Stimmung, Zeitbudget, Intensität, sozialer Kontext und Referenztitel
- Feedback-Nachrichten für die AI-Klassifizierung im Admin-Flow

### Guardrails

- OpenRouter wird ausschließlich serverseitig genutzt
- jede KI-Aktion wird mit Zod validiert
- Antworten werden in strukturierte, UI-taugliche JSON-Formate gezwungen
- Prompts sind absichtlich kurz und auf erklärende, kuratierende Antworten begrenzt
- Unsicherheit wird konservativ formuliert statt halluziniert
- interaktive KI-Aktionen werden bewusst on-demand ausgelöst; zusätzlich werden einzelne Detailseiten-Inhalte serverseitig als AI-Kontext eingebettet

### Warum diese KI-Funktionen Mehrwert haben

- erklärend:
  Vibe-Tags, Content-Warnings, Person-Insights
- empfehlend:
  Assistenzmodus, Zeit- und Sozialkontext-Vorschläge
- kuratierend:
  Titelvergleich, Watchlist-Priorisierung

## Persönliches Feedback

- Watchlist-Einträge können als `gesehen` markiert werden
- für gesehene Titel kann gespeichert werden, ob sie gefallen haben oder nicht
- diese Signale werden persistent in Supabase gespeichert
- der Empfehlungs-Teil der KI berücksichtigt diese Signale, damit Anfragen wie `Schlage mir Filme vor wie die, die mir gefallen haben` auf reale Nutzerpräferenzen zugreifen können

## Where to watch

- nutzt ausschließlich TMDB Watch Providers
- auf Film- und Serien-Detailseiten wird angezeigt, wo ein Titel im gewählten Land verfügbar ist
- das Standardland wird clientseitig aus `navigator.languages` oder `navigator.language` über `Intl.Locale` abgeleitet
- Nutzer:innen können das Land manuell überschreiben; die Auswahl wird in `localStorage` gespeichert
- wenn keine Region erkannt wird, fällt die App auf `DE` zurück
- Anbieter werden gruppiert als `Im Abo`, `Kostenlos`, `Mit Werbung`, `Leihen`, `Kaufen`
- bewusst keine Preisangaben oder Tarifdetails

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- App Router
- Tailwind CSS 4
- shadcn/ui primitives
- lucide-react
- Framer Motion
- Supabase Auth + Database
- TMDB API
- OpenRouter API
- Vercel als Ziel-Deployment

## Architekturüberblick

```text
src/
  app/
    page.tsx
    search/page.tsx
    discover/page.tsx
    movie/[id]/page.tsx
    tv/[id]/page.tsx
    person/[id]/page.tsx
    watchlist/page.tsx
    ai/page.tsx
    auth/*
    api/ai/assistant/route.ts
    api/watch-providers/*
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
    search/
    watch-providers/
    watchlist/
  lib/
    ai/
    supabase/
    tmdb/
    validators/
  types/
```

Architekturprinzipien:

- UI und Datenzugriffe sind getrennt
- TMDB-Zugriffe liegen zentral in `src/lib/tmdb/*`
- Supabase-Client, Server-Queries und Session-Handling liegen in `src/lib/supabase/*`
- KI-Logik ist serverseitig in `src/lib/ai/*` gekapselt
- Presentational Components kennen keine API-Keys oder Roh-Responses

## Setup lokal

1. Dependencies installieren

```bash
npm install
```

2. `.env.local` aus `.env.example` ableiten und Werte eintragen

3. Supabase-Schema ausführen

```sql
-- Datei: supabase/schema.sql
```

4. Entwicklungsserver starten

```bash
npm run dev
```

5. Typecheck ausführen

```bash
npm run check
```

6. Produktionsbuild prüfen

```bash
npm run build
```

## Environment Variables

Benötigt:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
TMDB_ACCESS_TOKEN=
OPENROUTER_API_KEY=
```

Optional:

```bash
NEXT_PUBLIC_APP_URL=
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Hinweise:

- `TMDB_API_KEY` oder `TMDB_ACCESS_TOKEN` wird nur serverseitig verwendet
- `TMDB_ACCESS_TOKEN` ist der richtige Slot für einen TMDB Read Access Token
- `OPENROUTER_API_KEY` wird nur serverseitig verwendet
- `SUPABASE_SERVICE_ROLE_KEY` darf niemals in Client-Komponenten verwendet werden
- öffentlich exponiert werden ausschließlich `NEXT_PUBLIC_*`-Variablen

## Supabase Setup

Das Schema liegt in `supabase/schema.sql`.

Mindestens umgesetzt:

- `profiles`
- `watchlist_items`
- `user_preferences`
- `ai_chat_sessions`
- `ai_chat_messages`
- `feedback_entries`

Die aktuell produktiv genutzte Persistenz konzentriert sich auf `watchlist_items`, `profiles`, `user_preferences` und `feedback_entries`. Dort liegen persönliches Medien-Feedback, regionale Präferenzen, das für den Jugendschutzfilter genutzte `birth_date` sowie das adminseitig sichtbare Nutzerfeedback.

### Zusätzliche SQL-Migration für Watchlist-Feedback

Falls deine Datenbank bereits existiert, führe diese Migration aus:

```sql
alter table public.watchlist_items
  add column if not exists watched boolean not null default false;

alter table public.watchlist_items
  add column if not exists liked boolean;
```

## Auth-Hinweise

- Auth basiert auf Supabase Email/Password
- die Watchlist-Seite ist geschützt und leitet nicht eingeloggte Nutzer:innen auf `/auth/login` weiter
- Session-Refresh erfolgt über `middleware.ts`
- Passwort-Reset läuft über Supabase und einen serverseitigen Confirm-Step
- Watchlist-Zugriffe laufen direkt gegen Supabase mit RLS statt gegen eine offene Custom-API

## RLS / Security

Die wichtigsten Policies:

- `watchlist_items`: `select/insert/update/delete` nur bei `auth.uid() = user_id`
- `profiles`: nur eigener Datensatz
- `user_preferences`: nur eigener Datensatz
- `ai_chat_sessions` und `ai_chat_messages`: nur für eigene Sessions

## TMDB-Integration

Abgedeckt:

- Trending Movies
- Trending TV
- Popular Movies
- Popular TV
- Search
- Movie Details
- TV Details
- Credits
- Videos / Trailer
- Watch Providers je Film und Serie
- Available Regions für den Country Selector
- Similar Titles
- Discover by Genre
- Person Details + Combined Credits

## Deployment

Zielplattform: Vercel

Aktueller Stand:

- die App ist für Vercel/Next.js strukturiert
- produktiver Link: `https://cine-scope-realr4an.vercel.app/`
- für Deployment müssen die oben genannten Env Vars im Vercel-Projekt gesetzt werden

## Agentic Engineering Dokumentation

Dieses Projekt wurde in einem bewusst zweistufigen agentischen Workflow umgesetzt.

1. Zuerst wurde mit ChatGPT ein klarer Arbeitsplan für zwei spezialisierte AI-Agents erstellt.
2. Auf Basis dieses Plans wurde Manus für einen ersten Frontend-Stand genutzt, um visuelle Richtung, Komponentenstruktur und erste UX-Muster schnell aufzubauen.
3. Anschließend wurde ein zweiter, auf diesen Stand aufbauender Prompt für Codex formuliert, mit Fokus auf Fullstack-Integration, Architektur, Backend-Anschlüsse, Datenflüsse, Auth, Persistenz, KI-Routen und Deployment-Reife.
4. Die weitere Entwicklung erfolgte dann interaktiv mit Codex: Anforderungen wurden konkretisiert, Fehlverhalten wurde direkt rückgemeldet, und die App wurde in vielen Schleifen technisch und produktseitig nachgeschärft.

Wie die Agenten konkret genutzt wurden:

- Manus: visuelle Grundlage, erste UI-Ideen, schneller Start für Layouts und Komponenten
- Codex: Integration in Next.js App Router, TMDB-Service-Layer, Supabase Auth + Watchlist, OpenRouter-Anbindung, Sicherheits- und Edge-Case-Fixes, README- und Deployment-Polish
- ChatGPT: Vorbereitung und Strukturierung der Agentenprompts, damit die Agenten mit klaren Rollen und sauberer Aufgabenabgrenzung arbeiten konnten

Was dabei manuell entschieden und kontrolliert wurde:

- welche Teile des Frontends beibehalten und welche technisch neu aufgebaut werden
- die Migration auf Next.js App Router statt Weiterführen einer weniger stabilen Ausgangsstruktur
- die Trennung zwischen UI, Feature-Schicht, TMDB-Layer, Supabase-Layer und AI-Layer
- Sicherheitsgrenzen wie Secret-Handling, serverseitige KI-Nutzung, RLS, Input-Validierung und defensive Fehlerbehandlung
- das laufende Gegensteuern bei Fehlverhalten der Agenten, z. B. bei falschen Verlinkungen, unpassenden KI-Ausgaben, zu starren Flows oder inkonsistenter UX

Praktisch bedeutete das:

- KI wurde als Beschleuniger für Struktur, Code-Erzeugung und Iteration genutzt
- die Richtung des Produkts wurde aber nicht blind vom Modell vorgegeben
- Entscheidungen wurden über wiederholtes Feedback, Tests, Builds und gezielte Nachschärfung getroffen
- besonders bei den KI-Features, der Datenintegration und der UX wurde stark iterativ gearbeitet statt nur einmalig generieren zu lassen

## Trade-offs

- der Supabase-Teil ist bewusst pragmatisch typisiert; die fachlichen Datengrenzen liegen sauber im Datenmodell und in RLS, nicht in übermäßig komplexen Client-Generics
- die KI ist absichtlich aktionsgetrieben und nicht permanent aktiv, um Kosten und visuelle Unruhe niedrig zu halten
- ein echter Franchise-Guide wurde nicht priorisiert, weil Vergleich, persönliche Passung, Watchlist-Priorisierung und Assistenzmodus produktrelevanter und belastbarer sind
- KI-Responses werden strukturiert angefordert, aber nicht mit zusätzlicher tiefer TMDB-Nachrecherche oder langfristiger Chat-Historie angereichert; das waeren sinnvolle naechste Schritte

## Nächste Schritte

- Vercel-Projekt verbinden und Live-Deployment einrichten
- Franchise-Guide für kuratierte große Reihen ergänzen
- AI-Historie oder gespeicherte Sessions in Supabase persistieren
- responsive QA auf echten Gerätegrößen vertiefen
- Tests für Mappers, Query-Validatoren und KI-Routen ergänzen




## Jugendschutz

- Besucher:innen ohne Konto werden beim ersten Besuch nach Geburtsdatum oder Alter gefragt.
- Die Angabe wird als Cookie gespeichert, damit serverseitige Filter für Listen und Detailseiten greifen können.
- Bei eingeloggten Nutzer:innen wird das Geburtsdatum zusätzlich im Supabase-Profil gespeichert.
- Inhalte mit höherer Altersfreigabe werden auf Listen verborgen und auf Detailseiten blockiert.
- Für Filmfreigaben wird bevorzugt die TMDB-Kennzeichnung für DE genutzt, mit Fallback auf US, falls keine deutsche Freigabe vorhanden ist.



