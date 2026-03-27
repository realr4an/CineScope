import type { AIPersonContext, AITitleContext } from "@/lib/ai/types";

type RecommendationFeedbackItem = {
  title: string;
  mediaType: "movie" | "tv";
  watched: boolean;
  liked: boolean | null;
};

function formatTitleContext(title: AITitleContext) {
  return [
    `Titel: ${title.title}`,
    `Typ: ${title.mediaType === "movie" ? "Film" : "Serie"}`,
    `Genres: ${title.genres.join(", ") || "unbekannt"}`,
    `Veröffentlichung: ${title.releaseDate ?? "unbekannt"}`,
    `Tagline: ${title.tagline ?? "keine"}`,
    `Overview: ${title.overview || "keine"}`,
    `Cast: ${title.cast?.join(", ") || "unbekannt"}`,
    `Laufzeit: ${title.runtime ?? "unbekannt"}`,
    `Staffeln: ${title.numberOfSeasons ?? "n/a"}`,
    `Episoden: ${title.numberOfEpisodes ?? "n/a"}`
  ].join("\n");
}

function formatFeedback(feedback: RecommendationFeedbackItem[]) {
  const likedTitles = feedback.filter(item => item.liked === true);
  const dislikedTitles = feedback.filter(item => item.liked === false);
  const watchedOnlyTitles = feedback.filter(item => item.watched && item.liked === null);

  return [
    likedTitles.length
      ? `Titel, die dem Nutzer gefallen haben:\n${likedTitles
          .map(item => `- ${item.title} (${item.mediaType === "movie" ? "Film" : "Serie"})`)
          .join("\n")}`
      : null,
    dislikedTitles.length
      ? `Titel, die dem Nutzer nicht gefallen haben:\n${dislikedTitles
          .map(item => `- ${item.title} (${item.mediaType === "movie" ? "Film" : "Serie"})`)
          .join("\n")}`
      : null,
    watchedOnlyTitles.length
      ? `Bereits gesehen, aber nicht bewertet:\n${watchedOnlyTitles
          .map(item => `- ${item.title} (${item.mediaType === "movie" ? "Film" : "Serie"})`)
          .join("\n")}`
      : null
  ]
    .filter(Boolean)
    .join("\n\n");
}

function baseGuardrails() {
  return [
    "Antworte knapp, nützlich und UI-tauglich.",
    "Keine Einleitung, kein Markdown, keine langen Essays.",
    "Nutze nur die bereitgestellten Daten und formuliere Unsicherheit vorsichtig.",
    "Wenn du etwas nicht sicher aus den Daten ableiten kannst, formuliere konservativ."
  ].join("\n");
}

export function recommendationPrompt(
  prompt: string,
  feedback: RecommendationFeedbackItem[] = []
) {
  return `
Du bist ein präziser Film- und Serienkurator.
${baseGuardrails()}
Antworte ausschließlich als JSON im Format:
{"recommendations":[{"title":"string","mediaType":"movie|tv","shortReason":"string","mood":"string optional","comparableTitle":"string optional"}]}

Regeln:
- max. 5 Empfehlungen
- nur reale, bekannte Titel
- kurze, konkrete Gründe
- positives und negatives Nutzerfeedback berücksichtigen
- bereits negativ bewertete Titel vermeiden

${formatFeedback(feedback) ? `Nutzerkontext:\n${formatFeedback(feedback)}\n` : ""}
User Prompt:
${prompt}
`.trim();
}

export function spoilerFreeSummaryPrompt(input: {
  title: string;
  mediaType: "movie" | "tv";
  overview: string;
  genres: string[];
  releaseDate?: string | null;
}) {
  return `
${baseGuardrails()}
Erstelle eine kurze spoilerfreie Zusammenfassung auf Deutsch.
Antworte mit maximal 4 Sätzen.
Nutze ausschließlich die bereitgestellten Fakten.

Titel: ${input.title}
Typ: ${input.mediaType === "movie" ? "Film" : "Serie"}
Genres: ${input.genres.join(", ") || "unbekannt"}
Veröffentlichung: ${input.releaseDate ?? "unbekannt"}
Overview: ${input.overview}
`.trim();
}

export function comparePrompt(left: AITitleContext, right: AITitleContext) {
  return `
Du vergleichst zwei Titel für Medienfans.
${baseGuardrails()}
Antworte ausschließlich als JSON im Format:
{"shortVerdict":"string","comparison":[{"label":"string","left":"string","right":"string"}],"guidance":"string"}

Vergleiche präzise in 5 bis 7 Punkten. Geeignete Dimensionen sind Ton, Tempo, Komplexität, Emotionalität, Worldbuilding, Zugänglichkeit und Zielgruppe.

Titel A:
${formatTitleContext(left)}

Titel B:
${formatTitleContext(right)}
`.trim();
}

export function fitPrompt(input: {
  title: AITitleContext;
  feedback: RecommendationFeedbackItem[];
  userPrompt?: string;
}) {
  return `
Du erklärst kurz, warum ein Titel zu einem Nutzer passen könnte.
${baseGuardrails()}
Antworte ausschließlich als JSON im Format:
{"summary":"string","reasons":["string","string"],"caveat":"string optional"}

Nutze vor allem Atmosphäre, Themen, Erzähltempo, Charakterfokus und Ähnlichkeiten zu positiv bewerteten Titeln.

${formatFeedback(input.feedback) ? `Nutzerkontext:\n${formatFeedback(input.feedback)}\n` : ""}
${input.userPrompt ? `Zusätzliche Nutzerfrage:\n${input.userPrompt}\n` : ""}
Zieltitel:
${formatTitleContext(input.title)}
`.trim();
}

export function priorityPrompt(input: {
  titles: AITitleContext[];
  context?: string;
}) {
  return `
Du hilfst bei der Reihenfolge mehrerer Titel.
${baseGuardrails()}
Antworte ausschließlich als JSON im Format:
{"summary":"string","order":[{"title":"string","mediaType":"movie|tv","reason":"string"}]}

Regeln:
- gib eine vollständige Reihenfolge für alle bereitgestellten Titel zurück
- halte die Reihenfolge explizit und nummerierbar
- wenn die Titel erkennbar zu einer Reihe oder Franchise gehören, liefere eine klare Watch Order
- erkläre je Titel kurz, warum er genau an dieser Position steht
- wenn es unterschiedliche sinnvolle Wege gäbe, entscheide dich für einen klaren Hauptpfad und erwähne die Logik kurz in der summary

${input.context ? `Nutzerkontext:\n${input.context}\n` : ""}
Kandidaten:
${input.titles.map(title => `- ${title.title} (${title.mediaType})`).join("\n")}
`.trim();
}

export function assistantPrompt(input: {
  prompt: string;
  mediaType: "all" | "movie" | "tv";
  timeBudget?: string;
  mood?: string;
  intensity?: string;
  socialContext?: string;
  references: AITitleContext[];
  feedback: RecommendationFeedbackItem[];
}) {
  return `
Du bist ein fokussierter Auswahl-Assistent für Filme und Serien.
${baseGuardrails()}
Antworte ausschließlich als JSON im Format:
{"framing":"string","picks":[{"title":"string","mediaType":"movie|tv","reason":"string","comparableTitle":"string optional"}],"nextStep":"string optional"}

Regeln:
- 3 bis 5 Vorschläge
- begründe jeden Vorschlag kurz
- respektiere Zeitbudget, Stimmung, Intensität und sozialen Kontext
- wenn Vergleichstitel gegeben sind, nutze sie gezielt
- wenn Nutzerfeedback gegeben ist, vermeide negativ bewertete Titel

Medientyp: ${input.mediaType}
Zeitbudget: ${input.timeBudget ?? "nicht angegeben"}
Stimmung: ${input.mood ?? "nicht angegeben"}
Intensität: ${input.intensity ?? "nicht angegeben"}
Sozialer Kontext: ${input.socialContext ?? "nicht angegeben"}

${formatFeedback(input.feedback) ? `Nutzerkontext:\n${formatFeedback(input.feedback)}\n` : ""}
${input.references.length ? `Referenztitel:\n${input.references.map(formatTitleContext).join("\n\n")}\n` : ""}
Nutzeranfrage:
${input.prompt}
`.trim();
}

export function titleInsightsPrompt(title: AITitleContext) {
  return `
Du erzeugst kurze KI-Insights für eine Titel-Detailseite.
${baseGuardrails()}
Antworte ausschließlich als JSON im Format:
{"vibeTags":["string","string","string"],"contentWarning":"string"}

Regeln:
- 3 bis 6 prägnante Vibe-Tags
- Content-Warning light, spoilerfrei und vorsichtig formuliert
- kein klinischer Ton

Titel:
${formatTitleContext(title)}
`.trim();
}

export function personInsightsPrompt(person: AIPersonContext) {
  return `
Du ordnest eine Schauspiel- oder Kreativperson für Medienfans kurz ein.
${baseGuardrails()}
Antworte ausschließlich als JSON im Format:
{"summary":"string","highlights":["string","string"]}

Fokus:
- wofür ist die Person bekannt?
- welche Rollen oder Werke definieren sie?
- welche Art von Projekten verbindet man mit ihr?

Person:
Name: ${person.name}
Department: ${person.knownForDepartment ?? "unbekannt"}
Biografie: ${person.biography || "keine"}
Top Credits:
${person.topCredits
  .map(credit => `- ${credit.title} (${credit.mediaType}, ${credit.roleLabel})`)
  .join("\n")}
`.trim();
}
