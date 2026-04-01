"use client";

import Link from "next/link";

import { useLanguage } from "@/features/i18n/language-provider";

export function SiteFooter() {
  const { dictionary, locale } = useLanguage();
  const feedbackLabel = locale === "en" ? "Feedback" : "Feedback";

  return (
    <footer className="border-t border-border/50 bg-background/80">
      <div className="page-content py-6">
        <div className="content-container flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>CineScope</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/feedback" className="transition-colors hover:text-foreground">
              {feedbackLabel}
            </Link>
            <Link href="/impressum" className="transition-colors hover:text-foreground">
              {dictionary.footer.imprint}
            </Link>
            <Link href="/datenschutz" className="transition-colors hover:text-foreground">
              {dictionary.footer.privacy}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
