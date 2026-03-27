import { AppShell } from "@/components/layout/app-shell";
import { AIAssistantPanel } from "@/features/ai/assistant-panel";
import { AIComparePanel } from "@/features/ai/compare-panel";

export default function AIPage() {
  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <AIAssistantPanel />
          <AIComparePanel />
        </div>
        <aside className="space-y-4 rounded-[2rem] border border-border/50 bg-card/50 p-6">
          <h2 className="text-xl font-semibold">Was dieser AI Layer tut</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Die KI ist hier kein endloser Chat, sondern ein fokussierter Auswahl-Assistent. Sie
            nutzt strukturierte TMDB-Daten, Watchlist-Feedback und kurze serverseitige Prompts, um
            kuratierte Vorschläge und Vergleiche zu liefern.
          </p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>Keine Secrets im Client</li>
            <li>Titelvergleich mit TMDB-Kontext</li>
            <li>Persönliche Passung über Watchlist-Signale</li>
            <li>Zeit- und Sozialkontext für kuratierte Vorschläge</li>
            <li>Knappe, UI-taugliche Antworten statt langer Essays</li>
          </ul>
        </aside>
      </div>
    </AppShell>
  );
}
