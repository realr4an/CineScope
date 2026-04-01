export const AGE_GATE_COOKIE_NAME = "cinescope_birth_date";
export const AGE_GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5;
export const UNKNOWN_CERTIFICATION_FALLBACK_AGE = 18;

export type AgeGateSource = "profile" | "cookie" | null;

export interface AgeGateState {
  birthDate: string | null;
  age: number | null;
  source: AgeGateSource;
  needsPrompt: boolean;
  isAdult: boolean;
}

export interface AgeCertification {
  region: string;
  label: string;
  minAge: number | null;
  system: "movie" | "tv";
}

export function normalizeBirthDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return trimmed;
}

export function calculateAgeFromBirthDate(
  birthDate: string | null | undefined,
  referenceDate = new Date()
) {
  const normalized = normalizeBirthDate(birthDate);

  if (!normalized) {
    return null;
  }

  const today = new Date(referenceDate);
  const birthday = new Date(`${normalized}T00:00:00.000Z`);

  if (birthday > today) {
    return null;
  }

  let age = today.getUTCFullYear() - birthday.getUTCFullYear();
  const monthDelta = today.getUTCMonth() - birthday.getUTCMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < birthday.getUTCDate())) {
    age -= 1;
  }

  if (age < 0 || age > 130) {
    return null;
  }

  return age;
}

export function deriveBirthDateFromAge(age: number, referenceDate = new Date()) {
  if (!Number.isInteger(age) || age < 0 || age > 130) {
    return null;
  }

  const year = referenceDate.getUTCFullYear() - age;
  const month = String(referenceDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(referenceDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseNumericCertification(value: string) {
  const match = value.match(/(0|6|12|13|14|16|17|18)/);
  return match ? Number(match[1]) : null;
}

export function mapMovieCertificationToMinAge(label: string, region: string) {
  const normalized = label.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  if (region === "DE") {
    const numeric = parseNumericCertification(normalized.replace("FSK", "").trim());
    return numeric ?? null;
  }

  if (region === "US") {
    if (normalized === "G") return 0;
    if (normalized === "PG") return 6;
    if (normalized === "PG-13") return 13;
    if (normalized === "R") return 17;
    if (normalized === "NC-17") return 18;
  }

  return parseNumericCertification(normalized);
}

export function mapTvCertificationToMinAge(label: string, region: string) {
  const normalized = label.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  if (region === "DE") {
    const numeric = parseNumericCertification(normalized.replace("FSK", "").trim());
    return numeric ?? null;
  }

  if (region === "US") {
    if (normalized === "TV-Y") return 0;
    if (normalized === "TV-Y7") return 7;
    if (normalized === "TV-G") return 0;
    if (normalized === "TV-PG") return 12;
    if (normalized === "TV-14") return 14;
    if (normalized === "TV-MA") return 18;
  }

  return parseNumericCertification(normalized);
}

export function isCertificationAllowed(minAge: number | null, viewerAge: number | null) {
  if (viewerAge === null) {
    return true;
  }

  if (minAge === null) {
    return viewerAge >= UNKNOWN_CERTIFICATION_FALLBACK_AGE;
  }

  return viewerAge >= minAge;
}

export function createAgeGateState(
  birthDate: string | null,
  source: AgeGateSource
): AgeGateState {
  const age = calculateAgeFromBirthDate(birthDate);

  return {
    birthDate,
    age,
    source,
    needsPrompt: !birthDate || age === null,
    isAdult: age !== null && age >= 18
  };
}
