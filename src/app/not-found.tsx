import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/states/state-components";

export default function NotFound() {
  return (
    <AppShell>
      <EmptyState
        title="Diese Seite existiert nicht"
        description="Der angeforderte Inhalt konnte nicht gefunden werden."
        action={{ label: "Zur Startseite", href: "/" }}
      />
    </AppShell>
  );
}
