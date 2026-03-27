import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/states/state-components";
import { AIWatchlistPriorityPanel } from "@/features/ai/watchlist-priority-panel";
import { WatchlistPageContent } from "@/features/watchlist/watchlist-page";
import { getPublicEnv } from "@/lib/env";
import { getViewer, getWatchlistForViewer } from "@/lib/supabase/queries";

export default async function WatchlistPage() {
  if (!getPublicEnv().success) {
    return (
      <AppShell>
        <ErrorState
          title="Supabase ist noch nicht konfiguriert"
          description="Lege die benötigten Umgebungsvariablen an und richte die Tabellen samt RLS ein."
        />
      </AppShell>
    );
  }

  const [viewer, watchlist] = await Promise.all([getViewer(), getWatchlistForViewer()]);

  if (!viewer) {
    redirect("/auth/login?next=/watchlist");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Meine Watchlist</h1>
          <p className="text-muted-foreground">
            Dauerhaft in Supabase gespeichert und pro Nutzer geschützt.
          </p>
        </div>
        <AIWatchlistPriorityPanel items={watchlist} />
        <WatchlistPageContent />
      </div>
    </AppShell>
  );
}
