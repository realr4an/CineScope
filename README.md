# CineScope

CineScope ist eine produktionsnahe Film- und Serien-Explorer-Web-App. Die App kombiniert TMDB fuer Live-Inhalte, Supabase fuer Auth und persistente Watchlist sowie OpenRouter fuer einen zusammenhaengenden AI Layer fuer Medien-Discovery.

## Gewaehltes Thema

Thema C: Film- & Serien-Explorer

## Kurzbeschreibung

Nutzer:innen koennen Trending- und Popular-Inhalte entdecken, Filme und Serien suchen, Detailseiten mit Cast, Trailern und Watch-Provider-Infos nutzen, persoenliche Watchlist-Eintraege persistent speichern und mehrere fokussierte KI-Features fuer Auswahl, Vergleich und Einordnung verwenden.

## Features

- Live-Startseite mit `Trending Movies`, `Trending TV`, `Popular Movies`, `Popular TV`
- Suche fuer Filme und Serien ueber TMDB
- Genre-basierte Discover-Seite mit Filtern
- Film- und Serien-Detailseiten mit Cast, Trailern, Similar Titles und KI-Zusammenfassung
- Person-Detailseiten mit Filmografie
- `Where to watch` auf Film- und Serien-Detailseiten mit Land-Auswahl und TMDB Watch Providers
- Supabase Auth mit Login, Signup und Passwort-Reset
- Persistente Watchlist pro User mit Row Level Security
- Watchlist-Feedback mit `gesehen`, `gefaellt mir`, `gefaellt mir nicht`
- Klickbare KI-Empfehlungen mit TMDB-Aufloesung auf Detailseiten oder Suche
- Dark Mode, Loading-, Empty- und Error-States

## AI Layer

Die KI ist bewusst nicht als lose Sammlung kleiner Chatbots umgesetzt, sondern als konsistente Schicht ueber der App.

### Kernfeatures

- Titelvergleich
- `Warum passt das zu mir?`
- `Was zuerst schauen?` auf der Watchlist
- Assistenzmodus zur Auswahlhilfe

### Zusaetzliche KI-Features

- Zeitbasierte Vorschlaege
- Eltern-/Freunde-/Date-Night-Helfer
- Vibe-Tags auf Detailseiten
- spoilerfreie Content-Warning light
- Person-Insights auf Personenseiten
- spoilerfreie KI-Zusammenfassung auf Detailseiten

### Wo die KI lebt

- Detailseiten:
  Vibe-Tags, Content-Warning light, persoenliche Passung, Titelvergleich
- Watchlist:
  Priorisierung mehrerer Titel mit optionalem Zeit- oder Situationskontext
- AI-Seite:
  fokussierter Assistenzmodus und eigenstaendiges Compare-Modul
- Personenseiten:
  kurze KI-Einordnung, wofuer eine Person bekannt ist

### Welche Inputs die KI nutzt

- TMDB-Titeldaten wie Titel, Overview, Genres, Laufzeit, Staffeln, Episoden, Cast und Release-Datum
- Watchlist-Feedback wie `gesehen`, `gefaellt`, `gefaellt nicht`
- Nutzerkontext wie Stimmung, Zeitbudget, Intensitaet, sozialer Kontext und Referenztitel

### Guardrails

- OpenRouter wird ausschliesslich serverseitig genutzt
- jede KI-Aktion wird mit Zod validiert
- Antworten werden in strukturierte, UI-taugliche JSON-Formate gezwungen
- Prompts sind absichtlich kurz und auf erklaerende, kuratierende Antworten begrenzt
- Unsicherheit wird konservativ formuliert statt halluziniert
- KI wird nur auf Nutzeraktion ausgelost, nicht permanent im Hintergrund

### Warum diese KI-Funktionen Mehrwert haben

- erklaerend:
  Vibe-Tags, Content-Warnings, Person-Insights, `Warum passt das zu mir?`
- empfehlend:
  Assistenzmodus, Zeit- und Sozialkontext-Vorschlaege
- kuratierend:
  Titelvergleich, Watchlist-Priorisierung

## Persoenliches Feedback

- Watchlist-Eintraege koennen als `gesehen` markiert werden
- fuer gesehene Titel kann gespeichert werden, ob sie gefallen haben oder nicht
- diese Signale werden persistent in Supabase gespeichert
- der Empfehlungs-Teil der KI beruecksichtigt diese Signale, damit Anfragen wie `Schlage mir Filme vor wie die, die mir gefallen haben` auf reale Nutzerpraeferenzen zugreifen koennen

## Where to watch

- nutzt ausschliesslich TMDB Watch Providers
- auf Film- und Serien-Detailseiten wird angezeigt, wo ein Titel im gewaehlten Land verfuegbar ist
- das Standardland wird clientseitig aus `navigator.languages` oder `navigator.language` ueber `Intl.Locale` abgeleitet
- Nutzer:innen koennen das Land manuell ueberschreiben; die Auswahl wird in `localStorage` gespeichert
- wenn keine Region erkannt wird, faellt die App auf `DE` zurueck
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

## Architekturueberblick

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

3. Supabase-Schema ausfuehren

```sql
-- Datei: supabase/schema.sql
```

4. Entwicklungsserver starten

```bash
npm run dev
```

5. Typecheck ausfuehren

```bash
npm run check
```

6. Produktionsbuild pruefen

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
- `TMDB_ACCESS_TOKEN` ist der richtige Slot fuer einen TMDB Read Access Token
- `OPENROUTER_API_KEY` wird nur serverseitig verwendet
- `SUPABASE_SERVICE_ROLE_KEY` darf niemals in Client-Komponenten verwendet werden
- oeffentlich exponiert werden ausschliesslich `NEXT_PUBLIC_*`-Variablen

## Supabase Setup

Das Schema liegt in `supabase/schema.sql`.

Mindestens umgesetzt:

- `profiles`
- `watchlist_items`
- `user_preferences`
- `ai_chat_sessions`
- `ai_chat_messages`

Die aktuell produktiv genutzte Persistenz konzentriert sich auf `watchlist_items`. Dort liegen auch `watched` und `liked` fuer persoenliches Medien-Feedback.

### Zusätzliche SQL-Migration fuer Watchlist-Feedback

Falls deine Datenbank bereits existiert, fuehre diese Migration aus:

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
- Passwort-Reset laeuft ueber Supabase und einen serverseitigen Confirm-Step
- Watchlist-Zugriffe laufen direkt gegen Supabase mit RLS statt gegen eine offene Custom-API

## RLS / Security

Die wichtigsten Policies:

- `watchlist_items`: `select/insert/update/delete` nur bei `auth.uid() = user_id`
- `profiles`: nur eigener Datensatz
- `user_preferences`: nur eigener Datensatz
- `ai_chat_sessions` und `ai_chat_messages`: nur fuer eigene Sessions

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
- Available Regions fuer den Country Selector
- Similar Titles
- Discover by Genre
- Person Details + Combined Credits

## Deployment

Zielplattform: Vercel

Aktueller Stand in diesem Workspace:

- die App ist fuer Vercel/Next.js strukturiert
- ein echter Live-Link ist in dieser Umgebung nicht hinterlegt, weil keine Vercel- oder Projekt-Credentials vorliegen
- fuer Deployment muessen die oben genannten Env Vars im Vercel-Projekt gesetzt werden

## Agentic Engineering Dokumentation

Dieses Projekt wurde bewusst agentisch umgesetzt, aber nicht blind generiert.

- Ein separater Frontend-Agent lieferte die visuelle Ausgangsbasis
- anschliessend wurde der Bestand manuell auditiert und in wiederverwendbare sowie prototypische Teile zerlegt
- die Migration auf Next.js, die TMDB-Service-Schicht, Supabase-Persistenz, Auth und OpenRouter-Integration wurden bewusst neu strukturiert
- die neue KI-Schicht wurde als modularer Assistenz-Layer gebaut, nicht als Sammlung loser Einzel-Chats
- KI wurde als Beschleuniger fuer Exploration und Strukturierung genutzt, aber Architekturentscheidungen, Refactors und Sicherheitsgrenzen wurden bewusst getroffen und manuell kontrolliert

Wichtige manuelle Entscheidungen:

- Vite/Wouter nicht weiter flicken, sondern sauber auf Next.js App Router migrieren
- keine Secrets im Client
- Watchlist direkt via Supabase + RLS statt halbgares eigenes Backend
- klare Service-Layer statt Fetch-Logik in UI-Komponenten
- Reuse der starken UI-Patterns, aber keine Uebernahme mock-basierter Datenlogik
- fokussierte AI-Aktionen statt eines unendlichen generischen Dauer-Chats

## Trade-offs

- der Supabase-Teil ist bewusst pragmatisch typisiert; die fachlichen Datengrenzen liegen sauber im Datenmodell und in RLS, nicht in uebermaessig komplexen Client-Generics
- die KI ist absichtlich aktionsgetrieben und nicht permanent aktiv, um Kosten und visuelle Unruhe niedrig zu halten
- ein echter Franchise-Guide wurde nicht priorisiert, weil Vergleich, persoenliche Passung, Watchlist-Priorisierung und Assistenzmodus produktrelevanter und belastbarer sind
- KI-Responses werden strukturiert angefordert, aber nicht mit zusaetzlicher tiefer TMDB-Nachrecherche oder langfristiger Chat-Historie angereichert; das waeren sinnvolle naechste Schritte

## Naechste Schritte

- Vercel-Projekt verbinden und Live-Deployment einrichten
- Franchise-Guide fuer kuratierte grosse Reihen ergaenzen
- AI-Historie oder gespeicherte Sessions in Supabase persistieren
- responsive QA auf echten Geraetegroessen vertiefen
- Tests fuer Mappers, Query-Validatoren und KI-Routen ergaenzen


