export function hasVisibleRating(rating: number | null | undefined, voteCount?: number | null) {
  return (voteCount ?? 0) > 0 && (rating ?? 0) > 0;
}

export function formatRating(
  rating: number | null | undefined,
  voteCount?: number | null,
  emptyLabel = "Unbewertet"
) {
  if (!hasVisibleRating(rating, voteCount)) {
    return emptyLabel;
  }

  return (rating ?? 0).toFixed(1);
}

export function formatDetailedRating(
  rating: number | null | undefined,
  voteCount?: number | null,
  emptyLabel = "Unbewertet"
) {
  if (!hasVisibleRating(rating, voteCount)) {
    return emptyLabel;
  }

  return `${(rating ?? 0).toFixed(1)} / 10`;
}

export function formatYear(date: string | null | undefined) {
  return date ? date.slice(0, 4) : "—";
}

export function formatDate(
  date: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
) {
  if (!date) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat(
      "de-DE",
      options ?? { year: "numeric", month: "long", day: "numeric" }
    ).format(new Date(date));
  } catch {
    return date;
  }
}

export function formatRuntime(minutes: number | null | undefined) {
  if (!minutes) {
    return "—";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) {
    return `${rest}m`;
  }

  if (!rest) {
    return `${hours}h`;
  }

  return `${hours}h ${rest}m`;
}

export function formatCurrency(value: number | null | undefined) {
  if (!value) {
    return "—";
  }

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function getRatingTone(rating: number | null | undefined, voteCount?: number | null) {
  if (!hasVisibleRating(rating, voteCount)) {
    return "bg-muted/40 text-muted-foreground border-border/50";
  }

  if ((rating ?? 0) >= 8) {
    return "bg-green-400/15 text-green-400 border-green-400/30";
  }

  if ((rating ?? 0) >= 6.5) {
    return "bg-amber-400/15 text-amber-400 border-amber-400/30";
  }

  if ((rating ?? 0) >= 5) {
    return "bg-orange-400/15 text-orange-400 border-orange-400/30";
  }

  return "bg-red-400/15 text-red-400 border-red-400/30";
}
