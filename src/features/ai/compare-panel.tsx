"use client";

import Link from "next/link";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
import { Button } from "@/components/ui/button";

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

export function AIComparePanel({
  leftPreset
}: {
  leftPreset?: { title: string; mediaType: "movie" | "tv" };
}) {
  const [leftQuery, setLeftQuery] = useState(leftPreset?.title ?? "");
  const [leftType, setLeftType] = useState<"all" | "movie" | "tv">(leftPreset?.mediaType ?? "all");
  const [rightQuery, setRightQuery] = useState("");
  const [rightType, setRightType] = useState<"all" | "movie" | "tv">("all");
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
            query: leftQuery,
            mediaType: leftType
          },
          right: {
            query: rightQuery,
            mediaType: rightType
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
      description="Vergleiche Stimmung, Tempo, Komplexitaet und Zielgruppe zweier Titel."
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
              <input
                value={leftQuery}
                onChange={event => setLeftQuery(event.target.value)}
                placeholder="Erster Titel"
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
              />
            ) : (
              <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-3 text-sm">
                {leftPreset.title}
              </div>
            )}
            {!leftPreset ? (
              <select
                value={leftType}
                onChange={event => setLeftType(event.target.value as "all" | "movie" | "tv")}
                className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
              >
                <option value="all">Film oder Serie</option>
                <option value="movie">Film</option>
                <option value="tv">Serie</option>
              </select>
            ) : null}
          </div>
          <div className="space-y-2">
            <input
              value={rightQuery}
              onChange={event => setRightQuery(event.target.value)}
              placeholder="Zweiter Titel"
              className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
            />
            <select
              value={rightType}
              onChange={event => setRightType(event.target.value as "all" | "movie" | "tv")}
              className="h-11 w-full rounded-xl border border-border/60 bg-background px-3 text-sm"
            >
              <option value="all">Film oder Serie</option>
              <option value="movie">Film</option>
              <option value="tv">Serie</option>
            </select>
          </div>
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
