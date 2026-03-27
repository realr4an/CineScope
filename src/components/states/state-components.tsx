"use client";

import { AlertTriangle, Film, Heart, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { cn } from "@/lib/utils";

type StateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
};

function StateBase({
  title,
  description,
  icon,
  action,
  className
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  action?: StateAction;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[2rem] border border-border/50 bg-card/60 px-6 py-20 text-center",
        className
      )}
    >
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {icon}
      </div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      {description ? <p className="mt-3 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? (
        <div className="mt-6">
          {action.href ? (
            <Button asChild variant="outline">
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState(props: {
  title: string;
  description?: string;
  action?: StateAction;
  className?: string;
}) {
  return <StateBase icon={<Film className="size-8" />} {...props} />;
}

export function EmptyFavoritesState(props: {
  action?: StateAction;
  className?: string;
}) {
  const { locale } = useLanguage();

  return (
    <StateBase
      icon={<Heart className="size-8" />}
      title={locale === "en" ? "No watchlist entries yet" : "Noch keine Watchlist-Einträge"}
      description={locale === "en"
        ? "Save movies and series to your personal watchlist so you can continue with them later."
        : "Speichere Filme und Serien in deiner persönlichen Watchlist, damit du später gezielt weitersehen kannst."}
      {...props}
    />
  );
}

export function ErrorState({
  title,
  description,
  action,
  className
}: {
  title: string;
  description?: string;
  action?: StateAction;
  className?: string;
}) {
  const { locale } = useLanguage();

  return (
    <StateBase
      icon={<AlertTriangle className="size-8 text-destructive" />}
      title={title}
      description={description ?? (locale === "en" ? "Please try again later." : "Bitte versuche es später erneut.")}
      action={action}
      className={className}
    />
  );
}

export function NoResultsState({ query }: { query: string }) {
  const { locale } = useLanguage();

  return (
    <StateBase
      icon={<SearchX className="size-8" />}
      title={locale === "en" ? "No matches found" : "Keine Treffer gefunden"}
      description={locale === "en"
        ? `No matching movies or series were found for "${query}".`
        : `Für "${query}" wurden keine passenden Filme oder Serien gefunden.`}
    />
  );
}
