import Link from "next/link";
import { ChevronRight, Search, Star, X } from "lucide-react";

import { getRatingTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Genre } from "@/types/media";

export function RatingBadge({
  rating,
  voteCount,
  className
}: {
  rating: number;
  voteCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 sm:gap-3", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-bold",
          getRatingTone(rating)
        )}
      >
        <Star className="size-3.5 fill-current" />
        {rating.toFixed(1)}
      </div>
      {voteCount ? (
        <span className="text-xs text-muted-foreground">
          {voteCount.toLocaleString("de-DE")} Bewertungen
        </span>
      ) : null}
    </div>
  );
}

export function GenreBadge({
  genre,
  active,
  href,
  onClick
}: {
  genre: Genre;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const classes = cn(
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
    active
      ? "border-primary/40 bg-primary/15 text-primary"
      : "border-border/50 bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {genre.name}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button className={classes} onClick={onClick} type="button">
        {genre.name}
      </button>
    );
  }

  return <span className={classes}>{genre.name}</span>;
}

export function GenreList({
  genres,
  max = 4,
  className
}: {
  genres: Genre[];
  max?: number;
  className?: string;
}) {
  const visible = genres.slice(0, max);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {visible.map(genre => (
        <GenreBadge key={genre.id} genre={genre} />
      ))}
      {genres.length > max ? (
        <span className="inline-flex items-center rounded-full border border-border/50 px-2.5 py-1 text-xs text-muted-foreground">
          +{genres.length - max}
        </span>
      ) : null}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  href
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          Alle anzeigen
          <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  onClear,
  placeholder = "Filme, Serien oder Personen suchen...",
  className
}: {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-border/60 bg-card/80 pl-11 pr-12 text-sm text-foreground shadow-sm transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  className
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            value === option.value
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function StatPill({
  label,
  value,
  icon
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/50 bg-card/70 p-3">
      {icon ? <div className="shrink-0 text-muted-foreground">{icon}</div> : null}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="break-words text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
