import type { Locale } from "@/lib/i18n/types";

export const dictionaries = {
  de: {
    common: {
      language: "Sprache",
      german: "Deutsch",
      english: "Englisch",
      themeSwitch: "Theme wechseln",
      login: "Login",
      logout: "Logout",
      account: "Account",
      unknownError: "Unbekannter Fehler",
      movie: "Film",
      tv: "Serie"
    },
    nav: {
      discover: "Entdecken",
      search: "Suche",
      categories: "Kategorien",
      ai: "KI",
      watchlist: "Watchlist"
    },
    footer: {
      imprint: "Impressum",
      privacy: "Datenschutz"
    },
    cookieNotice: {
      title: "Hinweis zu Cookies und lokalem Speicher",
      description:
        "CineScope verwendet derzeit nur technisch notwendige Cookies und ähnliche Speichermechanismen, zum Beispiel für Login-Sessions, Jugendschutz, Sprache, Theme und Länderpräferenzen. Tracking- oder Marketing-Cookies werden aktuell nicht eingesetzt.",
      accept: "Verstanden",
      learnMore: "Mehr erfahren"
    },
    home: {
      badge: "Trending diese Woche",
      title: "Entdecke Filme und Serien mit echtem Daten- und KI-Stack.",
      description:
        "TMDB liefert Live-Daten für Trending, Popular, Detailseiten und Cast. Supabase speichert deine Watchlist dauerhaft, OpenRouter ergänzt intelligente Empfehlungen.",
      featured: "Featured ansehen",
      startSearch: "Suche starten",
      exploreCategories: "Kategorien entdecken",
      trending: "Trending",
      popular: "Popular",
      aiAssist: "AI Assist",
      liveTitles: "Live-Titel",
      curatedMatches: "kuratierte Treffer",
      integrated: "integriert",
      trendingMovies: "Trending Filme",
      trendingMoviesSubtitle: "Diese Woche besonders gefragt",
      trendingSeries: "Trending Serien",
      trendingSeriesSubtitle: "Aktuell heiß diskutiert",
      popularMovies: "Beliebte Filme",
      popularMoviesSubtitle: "Community-Favoriten mit hoher Reichweite",
      popularSeries: "Beliebte Serien",
      popularSeriesSubtitle: "Serien mit hoher Sichtbarkeit und Relevanz",
      recommendedMovies: "Filme, die dir gefallen könnten",
      recommendedMoviesSubtitle:
        "Personalisierte Vorschläge basierend auf deiner Watchlist und deinen Bewertungen",
      recommendedSeries: "Serien, die dir gefallen könnten",
      recommendedSeriesSubtitle:
        "Abgeleitet aus gesehenen, gemochten und nicht gemochten Titeln",
      errorTitle: "Startseite konnte nicht geladen werden"
    },
    searchPage: {
      title: "Suche",
      description: "Suche über TMDB nach Filmen und Serien mit produktionsnahen Zuständen.",
      results: "Ergebnisse",
      matchesFor: "Treffer für",
      discoverTitle: "Beliebte Einstiege",
      discoverSubtitle: "Suche gezielt oder starte mit populären Titeln.",
      errorTitle: "Suche konnte nicht geladen werden"
    },
    searchForm: {
      searchPlaceholder: "Filme, Serien oder Personen suchen...",
      all: "Alle",
      movies: "Filme",
      series: "Serien",
      popularity: "Beliebtheit",
      rating: "Bewertung",
      releaseDate: "Erscheinungsdatum",
      country: "Land",
      allCountries: "Alle Länder",
      streamingService: "Streamingdienst",
      allStreamingServices: "Alle Streamingdienste",
      loadingStreamingServices: "Streamingdienste laden...",
      streamingServiceError: "Streamingdienste konnten nicht geladen werden",
      search: "Suchen"
    },
    discoverPage: {
      title: "Kategorien",
      description:
        "Finde Filme und Serien nach Kategorien mit Rating-, Jahr- und Sortierungsfiltern.",
      discoverMovies: "Filme entdecken",
      discoverSeries: "Serien entdecken",
      resultsFromTmdb: "Treffer aus TMDB Discover",
      errorTitle: "Discover konnte nicht geladen werden"
    },
    discoverFilters: {
      movies: "Filme",
      series: "Serien",
      allCategories: "Alle Kategorien",
      year: "Jahr",
      yearFrom: "Jahr von",
      yearTo: "Jahr bis",
      anyYear: "Alle Jahre",
      minRating: "Min. Rating",
      allRatings: "Alle Bewertungen",
      popularity: "Beliebtheit",
      rating: "Bewertung",
      newestMovies: "Neueste Filme",
      newestSeries: "Neueste Serien",
      country: "Land",
      streamingService: "Streamingdienst",
      allStreamingServices: "Alle Streamingdienste",
      loadingStreamingServices: "Streamingdienste laden...",
      streamingServiceError: "Streamingdienste konnten nicht geladen werden",
      apply: "Filter anwenden"
    },
    watchlistPage: {
      title: "Meine Watchlist",
      description:
        "Dauerhaft in Supabase gespeichert, pro Nutzer geschützt und altersgerecht gefiltert.",
      configTitle: "Supabase ist noch nicht konfiguriert",
      configDescription:
        "Lege die benötigten Umgebungsvariablen an und richte die Tabellen samt RLS ein."
    },
    watchlist: {
      filter: "Filter",
      all: "Alle",
      watched: "Gesehen",
      liked: "Gemocht",
      disliked: "Nicht gemocht",
      remove: "Entfernen",
      saveFirst:
        "Füge den Titel zuerst zur Watchlist hinzu, um ihn als gesehen zu markieren oder zu bewerten.",
      markWatched: "Als gesehen markieren",
      like: "Gefällt mir",
      dislike: "Gefällt mir nicht",
      rateAfterWatch:
        "Erst nach dem Abhaken als gesehen kannst du speichern, ob dir der Titel gefallen hat oder nicht.",
      saved: "Gespeichert",
      addToWatchlist: "Zur Watchlist",
      noItemsTitle: "Noch keine Watchlist-Einträge",
      noItemsDescription:
        "Speichere Filme und Serien in deiner persönlichen Watchlist, damit du später gezielt weitersehen kannst.",
      emptyAction: "Inhalte entdecken",
      noFilteredTitle: "Keine passenden Watchlist-Einträge",
      noFilteredDescription: "Für den aktuell gewählten Filter gibt es noch keine Titel.",
      showAll: "Alle anzeigen",
      likedMe: "Gefällt mir",
      dislikedMe: "Gefällt mir nicht"
    },
    authPage: {
      loginTitle: "Login",
      loginDescription: "Melde dich an, um deine Watchlist persistent zu speichern.",
      signupTitle: "Registrieren",
      signupDescription:
        "Erstelle ein Konto für eine persönliche Watchlist und zukünftige Personalisierung.",
      forgotTitle: "Passwort vergessen",
      forgotDescription: "Wir senden dir einen sicheren Link, um dein Passwort zurückzusetzen.",
      resetTitle: "Neues Passwort setzen",
      resetDescription:
        "Verwende den Link aus deiner E-Mail, um hier ein neues Passwort zu speichern."
    },
    auth: {
      email: "E-Mail",
      password: "Passwort",
      newPassword: "Neues Passwort",
      confirmPassword: "Passwort wiederholen",
      minEight: "Mindestens 8 Zeichen",
      confirmPasswordPlaceholder: "Passwort bestätigen",
      login: "Einloggen",
      signUp: "Registrieren",
      forgotPassword: "Passwort vergessen?",
      noAccount: "Noch kein Konto?",
      registerNow: "Jetzt registrieren",
      alreadyRegistered: "Bereits registriert?",
      backToLogin: "Zum Login",
      sendResetLink: "Reset-Link senden",
      saveNewPassword: "Neues Passwort speichern",
      resetLinkChecking: "Reset-Link wird verifiziert...",
      requestNewLinkStart: "Fordere einen neuen Link unter",
      requestNewLinkEnd: "an.",
      loginSuccess: "Login erfolgreich.",
      signupSuccessLoggedIn: "Account erstellt. Du bist jetzt eingeloggt.",
      signupSuccessConfirm:
        "Account erstellt. Bitte bestätige jetzt deine E-Mail und melde dich danach an.",
      resetSent: "Reset-Link versendet. Bitte prüfe dein Postfach.",
      passwordUpdated: "Passwort aktualisiert. Du kannst dich jetzt einloggen.",
      supabaseNotConfigured: "Supabase ist nicht konfiguriert.",
      passwordTooShort: "Das Passwort muss mindestens 8 Zeichen haben.",
      passwordsNoMatch: "Die Passwörter stimmen nicht überein.",
      invalidResetLink:
        "Der Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
      verifyResetError: "Reset-Link konnte nicht verifiziert werden.",
      updatePasswordError: "Passwort konnte nicht aktualisiert werden."
    },
    aiPage: {
      title: "Was dieser AI Layer tut",
      description:
        "Die KI ist hier kein endloser Chat, sondern ein fokussierter Auswahl-Assistent. Sie nutzt strukturierte TMDB-Daten, Watchlist-Feedback und kurze serverseitige Prompts, um kuratierte Vorschläge und Vergleiche zu liefern.",
      bullets: [
        "Keine Secrets im Client",
        "Titelvergleich mit TMDB-Kontext",
        "Persönliche Passung über Watchlist-Signale",
        "Zeit- und Sozialkontext für kuratierte Vorschläge",
        "Knappe, UI-taugliche Antworten statt langer Essays"
      ]
    },
    detail: {
      backHome: "Zur Startseite",
      titleBlocked: "Dieser Titel ist für dein Alter gesperrt",
      blockedHigherRating: "einer höheren Altersfreigabe",
      blockedDescriptionMiddle: "ist aktuell mit",
      blockedDescriptionEnd: "gekennzeichnet und wird deshalb ausgeblendet.",
      similarMovies: "Ähnliche Filme",
      similarMoviesSubtitle: "Passende Anschlusskandidaten",
      similarSeries: "Ähnliche Serien",
      similarSeriesSubtitle: "Mehr aus derselben Zielgruppe",
      details: "Details",
      rating: "Bewertung",
      runtime: "Laufzeit",
      budget: "Budget",
      revenue: "Einspielergebnis",
      seasons: "Staffeln",
      episodes: "Episoden",
      averageRuntime: "Durchschnitts-Laufzeit",
      status: "Status",
      originalTitle: "Originaltitel",
      release: "Veröffentlichung",
      firstAirDate: "Erstausstrahlung",
      originalLanguage: "Originalsprache",
      ageRating: "Altersfreigabe",
      languages: "Sprachen",
      networks: "Netzwerke",
      notAvailable: "Nicht hinterlegt"
    }
  },
  en: {
    common: {
      language: "Language",
      german: "German",
      english: "English",
      themeSwitch: "Switch theme",
      login: "Login",
      logout: "Logout",
      account: "Account",
      unknownError: "Unknown error",
      movie: "Movie",
      tv: "TV series"
    },
    nav: {
      discover: "Discover",
      search: "Search",
      categories: "Categories",
      ai: "AI",
      watchlist: "Watchlist"
    },
    footer: {
      imprint: "Imprint",
      privacy: "Privacy"
    },
    cookieNotice: {
      title: "Notice about cookies and local storage",
      description:
        "CineScope currently uses only technically necessary cookies and similar storage, for example for login sessions, age filtering, language, theme and region preferences. Tracking or marketing cookies are not currently used.",
      accept: "Understood",
      learnMore: "Learn more"
    },
    home: {
      badge: "Trending this week",
      title: "Discover movies and series with a real data and AI stack.",
      description:
        "TMDB powers live trending, popular, detail and cast data. Supabase keeps your watchlist persistent, and OpenRouter adds smart recommendations.",
      featured: "View featured title",
      startSearch: "Start search",
      exploreCategories: "Explore categories",
      trending: "Trending",
      popular: "Popular",
      aiAssist: "AI Assist",
      liveTitles: "live titles",
      curatedMatches: "curated picks",
      integrated: "integrated",
      trendingMovies: "Trending movies",
      trendingMoviesSubtitle: "In demand this week",
      trendingSeries: "Trending series",
      trendingSeriesSubtitle: "Hotly discussed right now",
      popularMovies: "Popular movies",
      popularMoviesSubtitle: "Community favorites with broad reach",
      popularSeries: "Popular series",
      popularSeriesSubtitle: "Highly visible and relevant shows",
      recommendedMovies: "Movies you might like",
      recommendedMoviesSubtitle:
        "Personalized picks based on your watchlist and your ratings",
      recommendedSeries: "Series you might like",
      recommendedSeriesSubtitle:
        "Derived from watched, liked, and disliked titles",
      errorTitle: "Could not load home page"
    },
    searchPage: {
      title: "Search",
      description: "Search TMDB for movies and series with production-grade states.",
      results: "results",
      matchesFor: "Matches for",
      discoverTitle: "Popular starting points",
      discoverSubtitle: "Search directly or start with popular titles.",
      errorTitle: "Could not load search"
    },
    searchForm: {
      searchPlaceholder: "Search movies, series or people...",
      all: "All",
      movies: "Movies",
      series: "Series",
      popularity: "Popularity",
      rating: "Rating",
      releaseDate: "Release date",
      country: "Country",
      allCountries: "All countries",
      streamingService: "Streaming service",
      allStreamingServices: "All streaming services",
      loadingStreamingServices: "Loading streaming services...",
      streamingServiceError: "Could not load streaming services",
      search: "Search"
    },
    discoverPage: {
      title: "Categories",
      description: "Find movies and series by category with rating, year and sort filters.",
      discoverMovies: "Discover movies",
      discoverSeries: "Discover series",
      resultsFromTmdb: "results from TMDB Discover",
      errorTitle: "Could not load discover"
    },
    discoverFilters: {
      movies: "Movies",
      series: "Series",
      allCategories: "All categories",
      year: "Year",
      yearFrom: "Year from",
      yearTo: "Year to",
      anyYear: "All years",
      minRating: "Min. rating",
      allRatings: "All ratings",
      popularity: "Popularity",
      rating: "Rating",
      newestMovies: "Newest movies",
      newestSeries: "Newest series",
      country: "Country",
      streamingService: "Streaming service",
      allStreamingServices: "All streaming services",
      loadingStreamingServices: "Loading streaming services...",
      streamingServiceError: "Could not load streaming services",
      apply: "Apply filters"
    },
    watchlistPage: {
      title: "My watchlist",
      description: "Persisted in Supabase, user-scoped and filtered for age suitability.",
      configTitle: "Supabase is not configured yet",
      configDescription: "Add the required environment variables and set up the tables with RLS."
    },
    watchlist: {
      filter: "Filter",
      all: "All",
      watched: "Watched",
      liked: "Liked",
      disliked: "Disliked",
      remove: "Remove",
      saveFirst: "Add the title to your watchlist first to mark it as watched or rate it.",
      markWatched: "Mark as watched",
      like: "I liked it",
      dislike: "I did not like it",
      rateAfterWatch:
        "You can only save whether you liked a title after marking it as watched.",
      saved: "Saved",
      addToWatchlist: "Add to watchlist",
      noItemsTitle: "No watchlist entries yet",
      noItemsDescription:
        "Save movies and series to your personal watchlist so you can pick them up later.",
      emptyAction: "Explore titles",
      noFilteredTitle: "No matching watchlist entries",
      noFilteredDescription: "There are no titles for the currently selected filter yet.",
      showAll: "Show all",
      likedMe: "Liked it",
      dislikedMe: "Did not like it"
    },
    authPage: {
      loginTitle: "Login",
      loginDescription: "Sign in to keep your watchlist persistent.",
      signupTitle: "Sign up",
      signupDescription: "Create an account for a personal watchlist and future personalization.",
      forgotTitle: "Forgot password",
      forgotDescription: "We will send you a secure link to reset your password.",
      resetTitle: "Set new password",
      resetDescription: "Use the link from your email to save a new password here."
    },
    auth: {
      email: "Email",
      password: "Password",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      minEight: "At least 8 characters",
      confirmPasswordPlaceholder: "Confirm password",
      login: "Log in",
      signUp: "Sign up",
      forgotPassword: "Forgot password?",
      noAccount: "No account yet?",
      registerNow: "Create one now",
      alreadyRegistered: "Already registered?",
      backToLogin: "Back to login",
      sendResetLink: "Send reset link",
      saveNewPassword: "Save new password",
      resetLinkChecking: "Verifying reset link...",
      requestNewLinkStart: "Request a new link under",
      requestNewLinkEnd: ".",
      loginSuccess: "Login successful.",
      signupSuccessLoggedIn: "Account created. You are now signed in.",
      signupSuccessConfirm: "Account created. Please confirm your email and sign in afterwards.",
      resetSent: "Reset link sent. Please check your inbox.",
      passwordUpdated: "Password updated. You can sign in now.",
      supabaseNotConfigured: "Supabase is not configured.",
      passwordTooShort: "Password must be at least 8 characters long.",
      passwordsNoMatch: "Passwords do not match.",
      invalidResetLink: "The reset link is invalid or expired. Please request a new one.",
      verifyResetError: "Could not verify reset link.",
      updatePasswordError: "Could not update password."
    },
    aiPage: {
      title: "What this AI layer does",
      description:
        "The AI is not an endless chat here, but a focused decision assistant. It uses structured TMDB data, watchlist feedback and short server-side prompts to produce curated suggestions and comparisons.",
      bullets: [
        "No secrets in the client",
        "Title comparison with TMDB context",
        "Personal fit based on watchlist signals",
        "Time and social context for curated picks",
        "Compact, UI-friendly answers instead of long essays"
      ]
    },
    detail: {
      backHome: "Back to home",
      titleBlocked: "This title is blocked for your age",
      blockedHigherRating: "a higher age rating",
      blockedDescriptionMiddle: "is currently marked with",
      blockedDescriptionEnd: "and is therefore hidden.",
      similarMovies: "Similar movies",
      similarMoviesSubtitle: "Strong follow-up candidates",
      similarSeries: "Similar series",
      similarSeriesSubtitle: "More from the same audience lane",
      details: "Details",
      rating: "Rating",
      runtime: "Runtime",
      budget: "Budget",
      revenue: "Revenue",
      seasons: "Seasons",
      episodes: "Episodes",
      averageRuntime: "Average runtime",
      status: "Status",
      originalTitle: "Original title",
      release: "Release",
      firstAirDate: "First air date",
      originalLanguage: "Original language",
      ageRating: "Age rating",
      languages: "Languages",
      networks: "Networks",
      notAvailable: "Not available"
    }
  }
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}






