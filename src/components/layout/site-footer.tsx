"use client";

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-background/80">
      <div className="page-content py-6">
        <div className="content-container flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>CineScope</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/impressum" className="transition-colors hover:text-foreground">
              Impressum
            </Link>
            <Link href="/datenschutz" className="transition-colors hover:text-foreground">
              Datenschutz
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
