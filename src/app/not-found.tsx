import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/states/state-components";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const { dictionary } = await getServerDictionary();
  const isEnglish = dictionary.common.language === "Language";

  return (
    <AppShell>
      <EmptyState
        title={isEnglish ? "This page does not exist" : "Diese Seite existiert nicht"}
        description={isEnglish ? "The requested content could not be found." : "Der angeforderte Inhalt konnte nicht gefunden werden."}
        action={{ label: isEnglish ? "Back to home" : "Zur Startseite", href: "/" }}
      />
    </AppShell>
  );
}
