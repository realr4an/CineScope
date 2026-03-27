"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Film, RefreshCw, Tv2 } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MediaListItem } from "@/types/media";

type CompareResponse = {
  mode: "compare";
  data: {
    shortVerdict: string;
    comparison: Array<{
      label: string;
      left: string;
      right: string;
    }>;
    guidance: string;
  };
  resolved: {
    left: { title: string; href: string };
    right: { title: string; href: string };
  };
};

async function fetchSuggestions(query: string, type: "all" | "movie" | "tv") {
  const params = new URLSearchParams({ q: query, type });
  const response = await fetch(`/api/search/suggest?${params.toString()}`);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Vorschläge konnten nicht geladen werden.");
  }

  const payload = (await response.json()) as { items: MediaListItem[] };
  return payload.items;
}

function SuggestionList({
  items,
  activeKey,
  onSelect
}: {
  items: MediaListItem[];
  activeKey?: string;
  onSelect: (item: MediaListItem) => void;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <div className="max-h-72 overflow-y-auto p-2">
        {items.map(item => {
          const key = `${item.mediaType}-${item.tmdbId}`;
          const isActive = key === activeKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(item)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {item.mediaType === "movie" ? (
                    <Film className="size-3.5" />
                  ) : (
                    <Tv2 className="size-3.5" />
                  )}
                  <span>{item.mediaType === "movie" ? "Film" : "Serie"}</span>
                  {item.releaseDate ? <span>· {item.releaseDate.slice(0, 4)}</span> : null}
                </div>
              </div>
              {isActive ? <Check className="size-4 shrink-0 text-primary" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompareAutocompleteField({
  value,
  onChange,
  onSelect,
  selected,
  type,
  onTypeChange,
  placeholder,
  disabledType = false
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: MediaListItem) => void;
  selected: MediaListItem | null;
  type: "all" | "movie" | "tv";
  onTypeChange: (value: "all" | "movie" | "tv") => void;
  placeholder: string;
  disabledType?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<MediaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const query = value.trim();

    if (query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    const currentRequestId = ++requestId.current;
    const timeout = window.setTimeout(async () => {
      setLoading(true);

      try {
        const results = await fetchSuggestions(query, type);

        if (requestId.current !== currentRequestId) {
          return;
        }

        setSuggestions(results);
        setOpen(true);
      } catch {
        if (requestId.current === currentRequestId) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (requestId.current === currentRequestId) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [type, value]);

  const visibleSuggestions = useMemo(() => {
    if (!open) {
      return [];
    }

    return suggestions;
  }, [open, suggestions]);

  const activeKey = selected ? `${selected.mediaType}-${selected.tmdbId}` : undefined;

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={value}
          onChange={event => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          placeholder={placeholder}
          className={cn(
            "h-11 w-full rounded-xl border border-border/60 bg-background px-3 pr-10 text-sm",
            loading ? "animate-pulse" : ""
          )}
        />
        {loading ? (
          <RefreshCw className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
        <SuggestionList
          items={visibleSuggestions}
          activeKey={activeKey}
          onSelect={item => {
            onSelect(item);
            setOpen(false);
          }}
        />
      </div>
      <select
        value={type}
        onChange={event => onTypeChange(event.target.value as "all" | "movie" | "tv")}
        disabled={disabledType}
        className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm disabled:opacity-70"
      >
        <option value="all">Film oder Serie</option>
        <option value="movie">Film</option>
        <option value="tv">Serie</option>
      </select>
    </div>
  );
}

export function AIComparePanel({
  leftPreset
}: {
  leftPreset?: { title: string; mediaType: "movie" | "tv" };
}) {
  const [leftQuery, setLeftQuery] = useState(leftPreset?.title ?? "");
  const [leftType, setLeftType] = useState<"all" | "movie" | "tv">(leftPreset?.mediaType ?? "all");
  const [rightQuery, setRightQuery] = useState("");
  const [rightType, setRightType] = useState<"all" | "movie" | "tv">("all");
  const [leftSelection, setLeftSelection] = useState<MediaListItem | null>(null);
  const [rightSelection, setRightSelection] = useState<MediaListItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const submit = async () => {
    if (!leftQuery.trim() || !rightQuery.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await postAIAction<CompareResponse>(
        {
          mode: "compare",
          left: {
            query: leftSelection?.title ?? leftQuery,
            mediaType: leftSelection?.mediaType ?? leftType
          },
          right: {
            query: rightSelection?.title ?? rightQuery,
            mediaType: rightSelection?.mediaType ?? rightType
          }
        },
        "Der Titelvergleich konnte nicht geladen werden."
      );

      setResult(response);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Der Titelvergleich konnte nicht geladen werden.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIPanelShell
      title="Titel vergleichen"
      description="Vergleiche Stimmung, Tempo, Komplexität und Zielgruppe zweier Titel. Beim Tippen erscheinen passende Vorschläge aus TMDB."
      actions={
        <Button onClick={submit} disabled={loading}>
          {loading ? <RefreshCw className="size-4 animate-spin" /> : null}
          Vergleichen
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            {!leftPreset ? (
              <CompareAutocompleteField
                value={leftQuery}
                onChange={value => {
                  setLeftQuery(value);
                  setLeftSelection(null);
                }}
                onSelect={item => {
                  setLeftQuery(item.title);
                  setLeftType(item.mediaType);
                  setLeftSelection(item);
                }}
                selected={leftSelection}
                type={leftType}
                onTypeChange={value => {
                  setLeftType(value);
                  setLeftSelection(null);
                }}
                placeholder="Erster Titel"
              />
            ) : (
              <div className="space-y-2">
                <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-3 text-sm">
                  {leftPreset.title}
                </div>
                <select
                  value={leftType}
                  onChange={event => setLeftType(event.target.value as "all" | "movie" | "tv")}
                  className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
                >
                  <option value="movie">Film</option>
                  <option value="tv">Serie</option>
                </select>
              </div>
            )}
          </div>
          <CompareAutocompleteField
            value={rightQuery}
            onChange={value => {
              setRightQuery(value);
              setRightSelection(null);
            }}
            onSelect={item => {
              setRightQuery(item.title);
              setRightType(item.mediaType);
              setRightSelection(item);
            }}
            selected={rightSelection}
            type={rightType}
            onTypeChange={value => {
              setRightType(value);
              setRightSelection(null);
            }}
            placeholder="Zweiter Titel"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/50 bg-background/50 p-4 text-sm text-muted-foreground">
              {result.data.shortVerdict}
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/50">
              <div className="overflow-x-auto">
                <div className="min-w-[40rem]">
                  <div className="grid grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] bg-background/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <div>Aspekt</div>
                    <Link href={result.resolved.left.href} className="truncate hover:text-primary">
                      {result.resolved.left.title}
                    </Link>
                    <Link href={result.resolved.right.href} className="truncate hover:text-primary">
                      {result.resolved.right.title}
                    </Link>
                  </div>
                  {result.data.comparison.map(row => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-t border-border/40 px-4 py-3 text-sm"
                    >
                      <div className="font-medium text-muted-foreground">{row.label}</div>
                      <div className="break-words">{row.left}</div>
                      <div className="break-words">{row.right}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{result.data.guidance}</p>
          </div>
        ) : null}
      </div>
    </AIPanelShell>
  );
}
