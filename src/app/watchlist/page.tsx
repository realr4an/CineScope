import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/states/state-components";
import { AIWatchlistPriorityPanel } from "@/features/ai/watchlist-priority-panel";
import { WatchlistPageContent } from "@/features/watchlist/watchlist-page";
import { getPublicEnv } from "@/lib/env";
import { filterMediaForViewerAge } from "@/lib/age-gate/server";
import { getServerDictionary } from "@/lib/i18n/server";
import { getViewer, getWatchlistForViewer } from "@/lib/supabase/queries";

export default async function WatchlistPage() {
  const { dictionary } = await getServerDictionary();

  if (!getPublicEnv().success) {
    return (
      <AppShell>
        <ErrorState
          title={dictionary.watchlistPage.configTitle}
          description={dictionary.watchlistPage.configDescription}
        />
      </AppShell>
    );
  }

  const [viewer, watchlist] = await Promise.all([getViewer(), getWatchlistForViewer()]);

  if (!viewer) {
    redirect("/auth/login?next=/watchlist");
  }

  const safeWatchlist = await filterMediaForViewerAge(watchlist);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {dictionary.watchlistPage.title}
          </h1>
          <p className="text-muted-foreground">{dictionary.watchlistPage.description}</p>
        </div>
        <AIWatchlistPriorityPanel items={safeWatchlist} />
        <WatchlistPageContent />
      </div>
    </AppShell>
  );
}
