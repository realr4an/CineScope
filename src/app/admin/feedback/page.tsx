import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/states/state-components";
import { AdminFeedbackList } from "@/features/feedback/admin-feedback-list";
import { getServerDictionary } from "@/lib/i18n/server";
import { getFeedbackEntriesForAdmin, getViewer } from "@/lib/supabase/queries";

export default async function AdminFeedbackPage() {
  const { locale } = await getServerDictionary();
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/auth/login?next=/admin/feedback");
  }

  if (!viewer.isAdmin) {
    return (
      <AppShell>
        <ErrorState
          title={locale === "en" ? "Admin access required" : "Admin-Zugriff erforderlich"}
          description={
            locale === "en"
              ? "This page is only available for admin accounts."
              : "Diese Seite ist nur für Admin-Konten verfügbar."
          }
        />
      </AppShell>
    );
  }

  const entries = await getFeedbackEntriesForAdmin();
  const text =
    locale === "en"
      ? {
          title: "Feedback inbox",
          description: "Stored feedback entries with AI-checked constructiveness flags.",
          empty: "No feedback has been stored yet."
        }
      : {
          title: "Feedback-Postfach",
          description: "Gespeicherte Feedback-Einträge mit KI-geprüfter Konstruktiv-Kennzeichnung.",
          empty: "Es wurden noch keine Feedback-Einträge gespeichert."
        };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{text.title}</h1>
          <p className="text-muted-foreground">{text.description}</p>
        </div>

        {entries.length ? (
          <AdminFeedbackList entries={entries} locale={locale} />
        ) : (
          <div className="rounded-[1.75rem] border border-border/50 bg-card/50 p-6 text-sm text-muted-foreground">
            {text.empty}
          </div>
        )}
      </div>
    </AppShell>
  );
}
