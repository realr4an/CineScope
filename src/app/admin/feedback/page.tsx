import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/states/state-components";
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
          description: "Approved feedback items stored after server-side AI moderation.",
          empty: "No approved feedback has been stored yet.",
          category: "Category",
          sender: "Sender",
          page: "Page",
          note: "Moderation note"
        }
      : {
          title: "Feedback-Postfach",
          description: "Freigegebene Feedback-Einträge nach serverseitiger KI-Prüfung.",
          empty: "Es wurden noch keine freigegebenen Feedback-Einträge gespeichert.",
          category: "Kategorie",
          sender: "Absender",
          page: "Seite",
          note: "Moderationshinweis"
        };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{text.title}</h1>
          <p className="text-muted-foreground">{text.description}</p>
        </div>

        {entries.length ? (
          <div className="space-y-4">
            {entries.map(entry => (
              <article
                key={entry.id}
                className="rounded-[1.75rem] border border-border/50 bg-card/50 p-5"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-primary">
                  <span>{entry.category}</span>
                  <span className="text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString(locale === "en" ? "en-US" : "de-DE")}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {text.sender}
                    </div>
                    <div className="mt-1 break-words">
                      {entry.displayName ?? entry.email ?? "Anonymous"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {text.page}
                    </div>
                    <div className="mt-1 break-words">{entry.pagePath ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {text.note}
                    </div>
                    <div className="mt-1 break-words">{entry.moderationSummary ?? "-"}</div>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-foreground">
                  {entry.message}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-border/50 bg-card/50 p-6 text-sm text-muted-foreground">
            {text.empty}
          </div>
        )}
      </div>
    </AppShell>
  );
}
