import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/states/state-components";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function UnderDevelopmentPage() {
  const { dictionary } = await getServerDictionary();
  const isEnglish = dictionary.common.language === "Language";

  return (
    <AppShell>
      <EmptyState
        title={isEnglish ? "Currently under development" : "Derzeit nur in Entwicklung"}
        description={
          isEnglish
            ? "This project is currently available only to approved admin accounts."
            : "Dieses Projekt ist aktuell nur für freigeschaltete Admin-Accounts verfügbar."
        }
      />
    </AppShell>
  );
}
