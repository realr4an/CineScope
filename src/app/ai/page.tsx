import { AppShell } from "@/components/layout/app-shell";
import { AIAssistantPanel } from "@/features/ai/assistant-panel";
import { AIComparePanel } from "@/features/ai/compare-panel";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function AIPage() {
  const { dictionary } = await getServerDictionary();

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <AIAssistantPanel />
          <AIComparePanel />
        </div>
        <aside className="space-y-4 rounded-[2rem] border border-border/50 bg-card/50 p-6">
          <h2 className="text-xl font-semibold">{dictionary.aiPage.title}</h2>
          <p className="text-sm leading-7 text-muted-foreground">{dictionary.aiPage.description}</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {dictionary.aiPage.bullets.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </div>
    </AppShell>
  );
}
