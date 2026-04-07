const STRONG_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /ignore\s+the\s+(system|developer|prior)\s+(prompt|message|instructions?)/i,
  /reveal\s+(the\s+)?(system prompt|developer prompt|hidden prompt|internal prompt|api key|token|secret)/i,
  /\b(system|developer)\s+prompt\b/i,
  /\b(jailbreak|bypass safety|override safety|disable safety)\b/i,
  /\breturn\s+exactly\s+this\s+json\b/i,
  /\byou\s+are\s+now\b/i,
  /\btool\s+call\b/i,
  /\bfunction\s+call\b/i
] as const;

const WEAK_INJECTION_PATTERNS = [
  /\brole:\s*(system|assistant|developer|user)\b/i,
  /\bassistant:\s*/i,
  /\bsystem:\s*/i,
  /\bdeveloper:\s*/i,
  /<system>/i,
  /<\/system>/i,
  /```(?:json|xml|yaml|markdown)?/i,
  /\bignore\b.{0,40}\b(prompt|instructions?)\b/i,
  /\b(show|print|dump)\b.{0,40}\b(prompt|instructions?|secrets?|token)\b/i
] as const;

const FEEDBACK_ABUSE_PATTERNS = [
  /\b(?:kill|die|rape|nazi|hitler)\b/i,
  /\b(?:fuck\s*you|go\s*kill\s*yourself|kys)\b/i,
  /\b(?:du\s+bist|you\s+are)\s+(?:ein\s+)?(?:idiot|dumm|behindert|abschaum|trash|worthless|stupid)\b/i,
  /\b(?:arschloch|hurensohn|fotze|wixxer|spast|idiot|bastard|asshole|bitch|motherfucker|retard)\b/i,
  /https?:\/\/\S+/gi,
  /(?:buy now|free money|crypto giveaway|telegram @)/i
] as const;

const FEEDBACK_OBFUSCATED_ABUSE_TERMS = [
  "arschloch",
  "hurensohn",
  "fotze",
  "wixxer",
  "spast",
  "idiot",
  "bastard",
  "fick",
  "ficken",
  "asshole",
  "motherfucker",
  "bitch",
  "retard",
  "nigger",
  "kys"
] as const;

const LEET_REPLACEMENTS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  "$": "s",
  "!": "i"
};

function normalizeForAbuseDetection(input: string) {
  const lowered = input.toLowerCase();
  const leetNormalized = lowered.replace(/[0134578@$!]/g, (char) => LEET_REPLACEMENTS[char] ?? char);

  return leetNormalized
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function findPromptInjectionSignal(input: string) {
  const normalized = input.trim();

  for (const pattern of STRONG_INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return "strong";
    }
  }

  let weakHits = 0;

  for (const pattern of WEAK_INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      weakHits += 1;
    }
  }

  return weakHits >= 2 ? "weak" : null;
}

export type PromptInjectionAssessment = {
  hasSignal: boolean;
  severity: "none" | "weak" | "strong";
  weakHits: number;
  strongHits: number;
};

export function assessPromptInjection(values: Array<string | null | undefined>): PromptInjectionAssessment {
  let weakHits = 0;
  let strongHits = 0;

  for (const value of values) {
    if (!value) {
      continue;
    }

    const signal = findPromptInjectionSignal(value);

    if (signal === "strong") {
      strongHits += 1;
    } else if (signal === "weak") {
      weakHits += 1;
    }
  }

  if (strongHits > 0) {
    return {
      hasSignal: true,
      severity: "strong",
      weakHits,
      strongHits
    };
  }

  if (weakHits > 0) {
    return {
      hasSignal: true,
      severity: "weak",
      weakHits,
      strongHits
    };
  }

  return {
    hasSignal: false,
    severity: "none",
    weakHits: 0,
    strongHits: 0
  };
}

export function containsPromptInjection(values: Array<string | null | undefined>) {
  return assessPromptInjection(values).hasSignal;
}

export function isUnsafeFeedbackMessage(input: string) {
  const trimmed = input.trim();

  if (findPromptInjectionSignal(trimmed)) {
    return true;
  }

  const urlMatches = trimmed.match(FEEDBACK_ABUSE_PATTERNS[1]);

  if (urlMatches && urlMatches.length >= 3) {
    return true;
  }

  if (FEEDBACK_ABUSE_PATTERNS.some((pattern, index) => index !== 4 && pattern.test(trimmed))) {
    return true;
  }

  const normalized = normalizeForAbuseDetection(trimmed);

  return FEEDBACK_OBFUSCATED_ABUSE_TERMS.some((term) => normalized.includes(term));
}
