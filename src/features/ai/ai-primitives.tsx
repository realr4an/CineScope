"use client";

import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AIAssistantPick } from "@/lib/ai/types";

export function AIPanelShell({
  title,
  description,
  actions,
  children,
  className
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[2rem] border border-border/50 bg-card/50 p-6", className)}>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="break-words text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function AITagList({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <span
          key={tag}
          className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function AIPicksGrid({
  picks,
  emptyText = "Noch keine Vorschläge."
}: {
  picks: AIAssistantPick[];
  emptyText?: string;
}) {
  if (!picks.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {picks.map(pick => (
        <Link
          key={`${pick.mediaType}-${pick.title}`}
          href={
            pick.href ??
            `/search?q=${encodeURIComponent(pick.title)}&type=${pick.mediaType}`
          }
          className="group rounded-2xl border border-border/50 bg-background/60 p-4 transition-colors hover:border-primary/40 hover:bg-background/80"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.18em] text-primary">
              {pick.mediaType === "movie" ? "Film" : "Serie"}
            </div>
            <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <h3 className="mt-2 text-lg font-semibold transition-colors group-hover:text-primary">
            {pick.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">{pick.reason}</p>
          {pick.comparableTitle ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Referenz: {pick.comparableTitle}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

export function AIRetry({
  onRetry,
  label = "Erneut versuchen"
}: {
  onRetry: () => void;
  label?: string;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onRetry}>
      {label}
    </Button>
  );
}

