"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/features/i18n/language-provider";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  const { locale } = useLanguage();

  return (
    <AppShell>
      <div className="rounded-[2rem] border border-destructive/20 bg-destructive/5 p-8">
        <h1 className="text-2xl font-semibold">{locale === "en" ? "Something went wrong" : "Etwas ist schiefgelaufen"}</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-6" onClick={reset}>{locale === "en" ? "Try again" : "Erneut versuchen"}</Button>
      </div>
    </AppShell>
  );
}
