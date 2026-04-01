import type { Locale } from "@/lib/i18n/types";
import type { AIPersonContext, AITitleContext } from "@/lib/ai/types";

type RecommendationFeedbackItem = {
  title: string;
  mediaType: "movie" | "tv";
  watched: boolean;
  liked: boolean | null;
};

type AssistantConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

const COPY = {
  de: {
    titleLabel: "Titel",
    typeLabel: "Typ",
    movie: "Film",
    series: "Serie",
    genres: "Genres",
    unknown: "unbekannt",
    release: "Veröffentlichung",
    tagline: "Tagline",
    none: "keine",
    overview: "Overview",
    cast: "Cast",
    runtime: "Laufzeit",
    seasons: "Staffeln",
    episodes: "Episoden",
    liked: "Titel, die dem Nutzer gefallen haben",
    disliked: "Titel, die dem Nutzer nicht gefallen haben",
    watched: "Bereits gesehen, aber nicht bewertet",
    concise: "Antworte knapp, nützlich und UI-tauglich.",
    noIntro: "Keine Einleitung, kein Markdown, keine langen Essays.",
    factsOnly: "Nutze nur die bereitgestellten Daten und formuliere Unsicherheit vorsichtig.",
    cautious: "Wenn du etwas nicht sicher aus den Daten ableiten kannst, formuliere konservativ.",
    curatorIntro: "Du bist ein präziser Film- und Serienkurator.",
    compareIntro: "Du vergleichst zwei Titel für Medienfans.",
    fitIntro: "Du erklärst kurz, warum ein Titel zu einem Nutzer passen könnte.",
    priorityIntro: "Du hilfst bei der Reihenfolge mehrerer Titel.",
    priorityGroupsIntro: "Du gruppierst eine persönliche Watchlist in sinnvolle Themen-Cluster.",
    assistantIntro: "Du bist ein fokussierter Auswahl-Assistent für Filme und Serien.",
    assistantTone: "Antworte wie ein natürlicher Chat-Assistent: freundlich, konkret, führend, aber nicht steif.",
    assistantFlow: "Greife den letzten Nutzerwunsch direkt auf und hilf mit dem nächsten sinnvollen Schritt.",
    assistantLanguageStrict:
      "Alle Antwortfelder (lead, personalNote, reasons, nextStep) müssen vollständig auf Deutsch sein, ohne Sprachmix.",
    assistantOffTopic:
      "Nur wenn die Anfrage klar nichts mit Filmen oder Serien zu tun hat, antworte kurz, dass du nur bei Film-/Serienauswahl hilfst, setze picks auf ein leeres Array und stelle eine kurze Rückfrage zum gewünschten Genre oder Mood.",
    assistantTitleInfo:
      "Fragen wie 'Erzähl mir mehr über <Titel>' oder 'Ich will mehr über <Titel> wissen' sind in-scope. Wenn Referenztitel-Daten vorhanden sind, gib 2 bis 4 konkrete, kurze Infos aus diesen Daten und leite optional zu passenden Empfehlungen über.",
    titleInsightsIntro: "Du erzeugst kurze KI-Insights für eine Titel-Detailseite.",
    personInsightsIntro: "Du ordnest eine Schauspiel- oder Kreativperson für Medienfans kurz ein.",
    outputJson: "Antworte ausschließlich als JSON im Format:",
    rules: "Regeln:",
    userContext: "Nutzerkontext:",
    userPrompt: "User Prompt:",
    summaryInstruction: "Erstelle eine kurze spoilerfreie Zusammenfassung auf Deutsch.",
    maxFour: "Antworte mit maximal 4 Sätzen.",
    providedFacts: "Nutze ausschließlich die bereitgestellten Fakten.",
    searchHelp: "Du hilfst bei der Korrektur von Suchanfragen für Film- und Serientitel.",
    mediaType: "Medientyp",
    input: "Eingabe",
    compareInstruction: "Vergleiche präzise in 5 bis 7 Punkten. Geeignete Dimensionen sind Ton, Tempo, Komplexität, Emotionalität, Worldbuilding, Zugänglichkeit und Zielgruppe.",
    titleA: "Titel A",
    titleB: "Titel B",
    fitInstruction: "Nutze vor allem Atmosphäre, Themen, Erzähltempo, Charakterfokus und Ähnlichkeiten zu positiv bewerteten Titeln.",
    fitCounterInstruction:
      "Nenne auch kurz, was gegen den Titel sprechen könnte, wenn es Spannungen zu negativ bewerteten oder unbewerteten Sehgewohnheiten gibt.",
    fitDataInstruction:
      "Wenn die Nutzerdaten dünn sind, sage das klar und vorsichtig. Wenige Signale bedeuten niedrigere Sicherheit.",
    extraQuestion: "Zusätzliche Nutzerfrage:",
    targetTitle: "Zieltitel:",
    priorityInstruction1: "gib eine vollständige Reihenfolge für alle bereitgestellten Titel zurück",
    priorityInstruction2: "halte die Reihenfolge explizit und nummerierbar",
    priorityInstruction3: "wenn die Titel erkennbar zu einer Reihe oder Franchise gehören, liefere eine klare Watch Order",
    priorityInstruction4: "erkläre je Titel kurz, warum er genau an dieser Position steht",
    priorityInstruction5: "wenn es unterschiedliche sinnvolle Wege gäbe, entscheide dich für einen klaren Hauptpfad und erwähne die Logik kurz in der summary",
    priorityInstruction6:
      "berücksichtige die Watchlist-Signale des Nutzers und priorisiere vor allem ungesehene Titel, die gut zu positiv bewerteten Titeln passen",
    priorityInstruction7:
      "bereits gesehene oder negativ bewertete Titel gehören normalerweise weiter nach unten, außer ein Rewatch wäre klar sinnvoll",
    priorityGroupsInstruction1:
      "teile alle Kandidaten in sinnvolle Gruppen auf (z. B. Franchise, Anime, Krimi, Sci-Fi, Feel-good)",
    priorityGroupsInstruction2:
      "wenn mehrere Titel klar zu derselben Reihe gehören, nutze den Reihennamen als Gruppenlabel",
    priorityGroupsInstruction3:
      "jede Gruppe braucht ein kurzes Label und optional eine knappe Beschreibung",
    priorityGroupsInstruction4:
      "ordne die Titel innerhalb jeder Gruppe in einer sinnvollen Watch-Reihenfolge",
    priorityGroupsInstruction5:
      "jeder Kandidat darf genau einmal vorkommen, es dürfen keine Kandidaten fehlen",
    priorityGroupsInstruction6:
      "halte die Gruppen praktisch und nutzerorientiert, keine abstrakten Taxonomien",
    candidates: "Kandidaten:",
    notSpecified: "nicht angegeben",
    mood: "Stimmung",
    intensity: "Intensität",
    socialContext: "Sozialer Kontext",
    referenceTitles: "Referenztitel:",
    request: "Nutzeranfrage:",
    conversation: "Bisheriger Gesprächsverlauf:",
    titleInsightsRules1: "3 bis 6 prägnante Vibe-Tags",
    titleInsightsRules2: "Content-Warning light, spoilerfrei und vorsichtig formuliert",
    titleInsightsRules3: "kein klinischer Ton",
    focus: "Fokus:",
    focus1: "wofür ist die Person bekannt?",
    focus2: "welche Rollen oder Werke definieren sie?",
    focus3: "welche Art von Projekten verbindet man mit ihr?",
    person: "Person:",
    name: "Name",
    department: "Department",
    biography: "Biografie",
    topCredits: "Top Credits",
    languageInstruction: "Alle erklärenden Texte und Begründungen müssen auf Deutsch formuliert sein."
  },
  en: {
    titleLabel: "Title",
    typeLabel: "Type",
    movie: "Movie",
    series: "Series",
    genres: "Genres",
    unknown: "unknown",
    release: "Release",
    tagline: "Tagline",
    none: "none",
    overview: "Overview",
    cast: "Cast",
    runtime: "Runtime",
    seasons: "Seasons",
    episodes: "Episodes",
    liked: "Titles the user liked",
    disliked: "Titles the user disliked",
    watched: "Already watched but not rated",
    concise: "Answer briefly, usefully, and in a UI-friendly way.",
    noIntro: "No intro, no Markdown, no long essays.",
    factsOnly: "Use only the provided data and express uncertainty carefully.",
    cautious: "If you cannot infer something reliably from the data, phrase it conservatively.",
    curatorIntro: "You are a precise movie and series curator.",
    compareIntro: "You compare two titles for media fans.",
    fitIntro: "You briefly explain why a title might fit a user.",
    priorityIntro: "You help decide the order of several titles.",
    priorityGroupsIntro: "You cluster a personal watchlist into meaningful themed groups.",
    assistantIntro: "You are a focused movie and series decision assistant.",
    assistantTone: "Answer like a natural chat assistant: friendly, concrete, and gently guiding without sounding rigid.",
    assistantFlow: "Address the user's latest need directly and help with the next sensible step.",
    assistantLanguageStrict:
      "All response fields (lead, personalNote, reasons, nextStep) must be fully in English with no language mixing.",
    assistantOffTopic:
      "Only if the request is clearly unrelated to movies or series, reply briefly that you only help with movie/series choices, set picks to an empty array, and ask one short follow-up about preferred genre or mood.",
    assistantTitleInfo:
      "Requests like 'tell me more about <title>' are in scope. If reference-title data is available, provide 2 to 4 short concrete facts from that data and optionally transition into fitting recommendations.",
    titleInsightsIntro: "You generate short AI insights for a title detail page.",
    personInsightsIntro: "You briefly frame an actor or creative person for media fans.",
    outputJson: "Respond only as JSON in the format:",
    rules: "Rules:",
    userContext: "User context:",
    userPrompt: "User prompt:",
    summaryInstruction: "Write a short spoiler-free summary in English.",
    maxFour: "Use at most 4 sentences.",
    providedFacts: "Use only the provided facts.",
    searchHelp: "You help correct search queries for movie and series titles.",
    mediaType: "Media type",
    input: "Input",
    compareInstruction: "Compare precisely in 5 to 7 points. Suitable dimensions are tone, pace, complexity, emotionality, worldbuilding, accessibility, and audience fit.",
    titleA: "Title A",
    titleB: "Title B",
    fitInstruction: "Focus on atmosphere, themes, pacing, character focus, and similarities to positively rated titles.",
    fitCounterInstruction:
      "Also briefly mention what may not fit if there is tension with negatively rated or only weakly supported watch history.",
    fitDataInstruction:
      "If the user data is thin, say so clearly and cautiously. Few signals mean lower confidence.",
    extraQuestion: "Additional user question:",
    targetTitle: "Target title:",
    priorityInstruction1: "return a complete order for all provided titles",
    priorityInstruction2: "make the order explicit and easy to number",
    priorityInstruction3: "if the titles clearly belong to a series or franchise, provide a clear watch order",
    priorityInstruction4: "briefly explain for each title why it belongs in that position",
    priorityInstruction5: "if multiple sensible approaches exist, choose one clear main path and mention the logic briefly in the summary",
    priorityInstruction6:
      "use the user's watchlist signals and prioritize mostly unwatched titles that best match what they liked",
    priorityInstruction7:
      "already watched or disliked titles should usually appear lower unless a rewatch clearly makes sense",
    priorityGroupsInstruction1:
      "group all candidates into meaningful clusters (for example franchise, anime, crime, sci-fi, comfort watch)",
    priorityGroupsInstruction2:
      "if multiple titles clearly belong to one saga/series, use that saga name as the group label",
    priorityGroupsInstruction3:
      "each group needs a short label and may include a short description",
    priorityGroupsInstruction4:
      "order titles inside each group in a sensible watch sequence",
    priorityGroupsInstruction5:
      "every candidate must appear exactly once and no candidate may be omitted",
    priorityGroupsInstruction6:
      "keep groups practical and user-friendly, avoid abstract taxonomies",
    candidates: "Candidates:",
    notSpecified: "not specified",
    mood: "Mood",
    intensity: "Intensity",
    socialContext: "Social context",
    referenceTitles: "Reference titles:",
    request: "User request:",
    conversation: "Conversation so far:",
    titleInsightsRules1: "3 to 6 concise vibe tags",
    titleInsightsRules2: "content warning light, spoiler-free, and cautiously phrased",
    titleInsightsRules3: "no clinical tone",
    focus: "Focus:",
    focus1: "what is this person known for?",
    focus2: "which roles or works define them?",
    focus3: "what type of projects are they associated with?",
    person: "Person:",
    name: "Name",
    department: "Department",
    biography: "Biography",
    topCredits: "Top credits",
    languageInstruction: "All explanatory text and reasoning must be written in English."
  }
} as const;

function copyFor(locale: Locale) {
  return COPY[locale];
}

function formatTitleContext(title: AITitleContext, locale: Locale) {
  const text = copyFor(locale);

  return [
    `${text.titleLabel}: ${title.title}`,
    `${text.typeLabel}: ${title.mediaType === "movie" ? text.movie : text.series}`,
    `${text.genres}: ${title.genres.join(", ") || text.unknown}`,
    `${text.release}: ${title.releaseDate ?? text.unknown}`,
    `${text.tagline}: ${title.tagline ?? text.none}`,
    `${text.overview}: ${title.overview || text.none}`,
    `${text.cast}: ${title.cast?.join(", ") || text.unknown}`,
    `${text.runtime}: ${title.runtime ?? text.unknown}`,
    `${text.seasons}: ${title.numberOfSeasons ?? "n/a"}`,
    `${text.episodes}: ${title.numberOfEpisodes ?? "n/a"}`
  ].join("\n");
}

function formatFeedback(feedback: RecommendationFeedbackItem[], locale: Locale) {
  const text = copyFor(locale);
  const likedTitles = feedback.filter(item => item.liked === true);
  const dislikedTitles = feedback.filter(item => item.liked === false);
  const watchedOnlyTitles = feedback.filter(item => item.watched && item.liked === null);

  return [
    likedTitles.length
      ? `${text.liked}:\n${likedTitles
          .map(item => `- ${item.title} (${item.mediaType === "movie" ? text.movie : text.series})`)
          .join("\n")}`
      : null,
    dislikedTitles.length
      ? `${text.disliked}:\n${dislikedTitles
          .map(item => `- ${item.title} (${item.mediaType === "movie" ? text.movie : text.series})`)
          .join("\n")}`
      : null,
    watchedOnlyTitles.length
      ? `${text.watched}:\n${watchedOnlyTitles
          .map(item => `- ${item.title} (${item.mediaType === "movie" ? text.movie : text.series})`)
          .join("\n")}`
      : null
  ]
    .filter(Boolean)
    .join("\n\n");
}

function baseGuardrails(locale: Locale) {
  const text = copyFor(locale);
  return [text.concise, text.noIntro, text.factsOnly, text.cautious, text.languageInstruction].join("\n");
}

export function recommendationPrompt(
  prompt: string,
  feedback: RecommendationFeedbackItem[] = [],
  locale: Locale = "de"
) {
  const text = copyFor(locale);
  return `
${text.curatorIntro}
${baseGuardrails(locale)}
${text.outputJson}
{"recommendations":[{"title":"string","mediaType":"movie|tv","shortReason":"string","mood":"string optional","comparableTitle":"string optional"}]}

${text.rules}
- max. 5 recommendations
- only real, well-known titles
- short, concrete reasons
- account for positive and negative user feedback
- avoid titles the user rated negatively

${formatFeedback(feedback, locale) ? `${text.userContext}\n${formatFeedback(feedback, locale)}\n` : ""}
${text.userPrompt}
${prompt}
`.trim();
}

export function spoilerFreeSummaryPrompt(input: {
  title: string;
  mediaType: "movie" | "tv";
  overview: string;
  genres: string[];
  releaseDate?: string | null;
}, locale: Locale = "de") {
  const text = copyFor(locale);
  return `
${baseGuardrails(locale)}
${text.summaryInstruction}
${text.maxFour}
${text.providedFacts}

${text.titleLabel}: ${input.title}
${text.typeLabel}: ${input.mediaType === "movie" ? text.movie : text.series}
${text.genres}: ${input.genres.join(", ") || text.unknown}
${text.release}: ${input.releaseDate ?? text.unknown}
${text.overview}: ${input.overview}
`.trim();
}

export function searchQueryInterpretationPrompt(input: {
  query: string;
  mediaType: "all" | "movie" | "tv";
}, locale: Locale = "de") {
  const text = copyFor(locale);
  return `
${text.searchHelp}
${baseGuardrails(locale)}
${text.outputJson}
{"normalizedQuery":"string","alternatives":["string","string"]}

${text.rules}
- correct only obvious typos, transposed letters, or misspellings
- no long rephrasings, no full sentences, only short searchable titles or search phrases
- if the input is already sensible, return it unchanged as normalizedQuery
- return at most 3 alternatives
- do not invent titles
- no explanations

${text.mediaType}: ${input.mediaType}
${text.input}: ${input.query}
`.trim();
}

export function comparePrompt(left: AITitleContext, right: AITitleContext, locale: Locale = "de") {
  const text = copyFor(locale);
  return `
${text.compareIntro}
${baseGuardrails(locale)}
${text.outputJson}
{"shortVerdict":"string","comparison":[{"label":"string","left":"string","right":"string"}],"guidance":"string"}

${text.compareInstruction}

${text.titleA}:
${formatTitleContext(left, locale)}

${text.titleB}:
${formatTitleContext(right, locale)}
`.trim();
}

export function fitPrompt(input: {
  title: AITitleContext;
  feedback: RecommendationFeedbackItem[];
  userPrompt?: string;
}, locale: Locale = "de") {
  const text = copyFor(locale);
  return `
${text.fitIntro}
${baseGuardrails(locale)}
${text.outputJson}
{"summary":"string","reasons":["string","string"],"counterpoints":["string optional"],"caveat":"string optional","confidence":"low|medium|high optional","dataNote":"string optional"}

${text.fitInstruction}
${text.fitCounterInstruction}
${text.fitDataInstruction}

${text.rules}
- focus on actual overlap or mismatch with the user's known watch history
- if evidence is weak, reduce confidence and explain that briefly
- do not pretend certainty when there are only a few watched or liked titles
- counterpoints should stay constructive and specific, not generic

${formatFeedback(input.feedback, locale) ? `${text.userContext}\n${formatFeedback(input.feedback, locale)}\n` : ""}
${input.userPrompt ? `${text.extraQuestion}\n${input.userPrompt}\n` : ""}
${text.targetTitle}
${formatTitleContext(input.title, locale)}
`.trim();
}

export function priorityPrompt(input: {
  titles: AITitleContext[];
  context?: string;
  feedback?: RecommendationFeedbackItem[];
}, locale: Locale = "de") {
  const text = copyFor(locale);
  return `
${text.priorityIntro}
${baseGuardrails(locale)}
${text.outputJson}
{"summary":"string","order":[{"title":"string","mediaType":"movie|tv","reason":"string"}]}

${text.rules}
- ${text.priorityInstruction1}
- ${text.priorityInstruction2}
- ${text.priorityInstruction3}
- ${text.priorityInstruction4}
- ${text.priorityInstruction5}
- ${text.priorityInstruction6}
- ${text.priorityInstruction7}

${input.feedback?.length ? `${text.userContext}\n${formatFeedback(input.feedback, locale)}\n` : ""}
${input.context ? `${text.userContext}\n${input.context}\n` : ""}
${text.candidates}
${input.titles
  .map(title => {
    const typeLabel = title.mediaType === "movie" ? text.movie : text.series;
    const genres = title.genres.slice(0, 3).join(", ") || text.unknown;
    const release = title.releaseDate ?? text.unknown;
    const seasons =
      title.mediaType === "tv" ? `, ${text.seasons}: ${title.numberOfSeasons ?? text.unknown}` : "";

    return `- ${title.title} (${typeLabel}, ${text.release}: ${release}, ${text.genres}: ${genres}${seasons})`;
  })
  .join("\n")}
`.trim();
}

export function priorityGroupsPrompt(input: {
  titles: AITitleContext[];
  context?: string;
  feedback?: RecommendationFeedbackItem[];
}, locale: Locale = "de") {
  const text = copyFor(locale);
  return `
${text.priorityGroupsIntro}
${baseGuardrails(locale)}
${text.outputJson}
{"summary":"string","groups":[{"label":"string","description":"string optional","items":[{"title":"string","mediaType":"movie|tv","reason":"string"}]}]}

${text.rules}
- ${text.priorityGroupsInstruction1}
- ${text.priorityGroupsInstruction2}
- ${text.priorityGroupsInstruction3}
- ${text.priorityGroupsInstruction4}
- ${text.priorityGroupsInstruction5}
- ${text.priorityGroupsInstruction6}
- nutze nur Kandidaten aus der Liste, keine neuen Titel
- max. 8 Gruppen

${input.feedback?.length ? `${text.userContext}\n${formatFeedback(input.feedback, locale)}\n` : ""}
${input.context ? `${text.userContext}\n${input.context}\n` : ""}
${text.candidates}
${input.titles
  .map(title => {
    const typeLabel = title.mediaType === "movie" ? text.movie : text.series;
    const genres = title.genres.slice(0, 3).join(", ") || text.unknown;
    const release = title.releaseDate ?? text.unknown;
    const seasons =
      title.mediaType === "tv" ? `, ${text.seasons}: ${title.numberOfSeasons ?? text.unknown}` : "";

    return `- ${title.title} (${typeLabel}, ${text.release}: ${release}, ${text.genres}: ${genres}${seasons})`;
  })
  .join("\n")}
`.trim();
}

export function assistantPrompt(input: {
  prompt: string;
  mediaType: "all" | "movie" | "tv";
  desiredPickCount: number;
  timeBudget?: string;
  mood?: string;
  intensity?: string;
  socialContext?: string;
  references: AITitleContext[];
  feedback: RecommendationFeedbackItem[];
  conversation: AssistantConversationMessage[];
}, locale: Locale = "de") {
  const text = copyFor(locale);
  return `
${text.assistantIntro}
${baseGuardrails(locale)}
${text.assistantTone}
${text.assistantFlow}
${text.assistantLanguageStrict}
${text.assistantOffTopic}
${text.assistantTitleInfo}
${text.outputJson}
{"lead":"string","personalNote":"string optional","picks":[{"title":"string","mediaType":"movie|tv","reason":"string","comparableTitle":"string optional"}],"nextStep":"string optional"}

${text.rules}
- return exactly ${input.desiredPickCount} suggestions (except true title-info requests where empty picks are allowed)
- never return more than 8 suggestions
- justify each suggestion briefly
- respect time budget, mood, intensity, and social context
- use reference titles deliberately when provided
- avoid titles the user rated negatively
- lead should be one short direct chat reply that clearly responds to the user's latest message
- personalNote should briefly explain why these picks fit this specific user or mood right now
- nextStep should be one short optional follow-up question or suggestion for the user
- write reasons in a user-facing way, not like neutral catalog blurbs
- if the user mentions a known title, explicitly connect the picks to what they may like about it
- for pure title-info questions, picks may be an empty array

${text.mediaType}: ${input.mediaType}
${text.runtime}: ${input.timeBudget ?? text.notSpecified}
${text.mood}: ${input.mood ?? text.notSpecified}
${text.intensity}: ${input.intensity ?? text.notSpecified}
${text.socialContext}: ${input.socialContext ?? text.notSpecified}

${formatFeedback(input.feedback, locale) ? `${text.userContext}\n${formatFeedback(input.feedback, locale)}\n` : ""}
${input.conversation.length ? `${text.conversation}\n${input.conversation.map(message => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`).join("\n")}\n` : ""}
${input.references.length ? `${text.referenceTitles}\n${input.references.map(reference => formatTitleContext(reference, locale)).join("\n\n")}\n` : ""}
${text.request}
${input.prompt}
`.trim();
}

export function titleInsightsPrompt(title: AITitleContext, locale: Locale = "de") {
  const text = copyFor(locale);
  return `
${text.titleInsightsIntro}
${baseGuardrails(locale)}
${text.outputJson}
{"vibeTags":["string","string","string"],"contentWarning":"string"}

${text.rules}
- ${text.titleInsightsRules1}
- ${text.titleInsightsRules2}
- ${text.titleInsightsRules3}

${text.titleLabel}:
${formatTitleContext(title, locale)}
`.trim();
}

export function personInsightsPrompt(person: AIPersonContext, locale: Locale = "de") {
  const text = copyFor(locale);
  return `
${text.personInsightsIntro}
${baseGuardrails(locale)}
${text.outputJson}
{"summary":"string","highlights":["string","string"]}

${text.focus}
- ${text.focus1}
- ${text.focus2}
- ${text.focus3}

${text.person}
${text.name}: ${person.name}
${text.department}: ${person.knownForDepartment ?? text.unknown}
${text.biography}: ${person.biography || text.none}
${text.topCredits}:
${person.topCredits
  .map(credit => `- ${credit.title} (${credit.mediaType}, ${credit.roleLabel})`)
  .join("\n")}
`.trim();
}
