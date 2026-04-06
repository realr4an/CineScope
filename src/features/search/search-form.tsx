"use client";

import { SearchField } from "@/components/shared/ui-components";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";
import { Loader2 } from "lucide-react";

export function SearchForm({
  query,
  onQueryChange,
  onSubmit,
  isPending
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const { dictionary, locale } = useLanguage();
  const loadingText = locale === "en" ? "Loading results..." : "Ergebnisse werden geladen...";

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-3 rounded-[2rem] border border-border/50 bg-card/50 p-5 sm:flex-row sm:items-center"
    >
      <SearchField
        value={query}
        onChange={onQueryChange}
        onClear={() => onQueryChange("")}
        className="max-w-4xl flex-1"
        placeholder={dictionary.searchForm.searchPlaceholder}
      />
      <Button type="submit" disabled={isPending} className="sm:self-stretch">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {dictionary.searchForm.search}
      </Button>
      {isPending ? (
        <p className="text-xs text-muted-foreground sm:ml-2" role="status" aria-live="polite">
          {loadingText}
        </p>
      ) : null}
    </form>
  );
}
