"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";

import { cn } from "@/lib/utils";

type DiscoverQuickLink = {
  label: string;
  href: string;
  active: boolean;
};

export function DiscoverQuickNav({
  mediaLabel,
  genreLabel,
  genreHint,
  mediaLinks,
  genreLinks,
  pendingText
}: {
  mediaLabel: string;
  genreLabel: string;
  genreHint?: string;
  mediaLinks: DiscoverQuickLink[];
  genreLinks: DiscoverQuickLink[];
  pendingText: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{mediaLabel}</p>
        <div className="flex flex-wrap gap-2">
          {mediaLinks.map(link => (
            <button
              key={link.href}
              type="button"
              onClick={() => navigate(link.href)}
              disabled={isPending}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                link.active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/50 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{genreLabel}</p>
        <div className="max-h-56 overflow-y-auto rounded-2xl border border-border/40 bg-background/35 p-3 pr-2">
          {genreHint ? (
            <p className="text-sm text-muted-foreground">{genreHint}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {genreLinks.map(link => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => navigate(link.href)}
                  disabled={isPending}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                    link.active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/50 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isPending ? (
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 animate-spin" />
          <span>{pendingText}</span>
        </div>
      ) : null}
    </>
  );
}
