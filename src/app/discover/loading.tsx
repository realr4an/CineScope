import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";

export default function DiscoverLoading() {
  return (
    <AppShell>
      <div className="flex min-h-[45vh] items-center justify-center">
        <div
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-4 animate-spin" />
          <span>Daten werden geladen...</span>
        </div>
      </div>
    </AppShell>
  );
}
