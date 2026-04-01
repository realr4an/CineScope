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
  /```(?:json|xml|yaml|markdown)?/i
] as const;

const FEEDBACK_ABUSE_PATTERNS = [
  /\b(?:kill|die|rape|nazi)\b/i,
  /https?:\/\/\S+/gi,
  /(?:buy now|free money|crypto giveaway|telegram @)/i
] as const;

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

export function containsPromptInjection(values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const signal = findPromptInjectionSignal(value);

    if (signal) {
      return true;
    }
  }

  return false;
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

  return FEEDBACK_ABUSE_PATTERNS.some((pattern, index) => index !== 1 && pattern.test(trimmed));
}
