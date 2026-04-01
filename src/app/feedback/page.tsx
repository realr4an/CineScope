import { AppShell } from "@/components/layout/app-shell";
import { FeedbackForm } from "@/features/feedback/feedback-form";
import { getServerDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/supabase/queries";

export default async function FeedbackPage() {
  const { locale } = await getServerDictionary();
  const viewer = await getViewer();

  const text =
    locale === "en"
      ? {
          title: "Feedback",
          description:
            "Share bugs, product ideas, UX friction, or content issues. Appropriate messages are stored for the admin account after AI moderation."
        }
      : {
          title: "Feedback",
          description:
            "Teile Bugs, Produktideen, UX-Probleme oder Inhaltsfehler. Geeignete Nachrichten werden nach KI-Prüfung für das Admin-Konto gespeichert."
        };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{text.title}</h1>
          <p className="max-w-3xl text-muted-foreground">{text.description}</p>
        </div>
        <FeedbackForm viewer={viewer} />
      </div>
    </AppShell>
  );
}
