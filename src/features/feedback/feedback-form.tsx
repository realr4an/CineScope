"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/features/i18n/language-provider";
import type { Viewer } from "@/types/auth";

export function FeedbackForm({ viewer }: { viewer: Viewer | null }) {
  const { locale } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [category, setCategory] = useState<"bug" | "idea" | "ui" | "content" | "other">("idea");
  const [displayName, setDisplayName] = useState(viewer?.displayName ?? "");
  const [email, setEmail] = useState(viewer?.email ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const text =
    locale === "en"
      ? {
          title: "Send feedback",
          description:
            "Feedback is checked server-side before it is stored for the admin inbox.",
          category: "Category",
          displayName: "Name",
          email: "Email",
          message: "Message",
          categories: {
            bug: "Bug",
            idea: "Idea",
            ui: "UI / UX",
            content: "Content",
            other: "Other"
          },
          namePlaceholder: "Optional display name",
          emailPlaceholder: "Optional contact email",
          messagePlaceholder:
            "What should be improved, fixed, or added? The clearer your feedback is, the easier it is to act on.",
          submit: "Send feedback",
          sending: "Sending...",
          success: "Thanks, your feedback was saved.",
          rejected:
            "This feedback could not be accepted in its current wording. Please keep it factual and app-related.",
          failure: "Feedback could not be sent."
        }
      : {
          title: "Feedback senden",
          description:
            "Feedback wird serverseitig geprüft, bevor es für das Admin-Postfach gespeichert wird.",
          category: "Kategorie",
          displayName: "Name",
          email: "E-Mail",
          message: "Nachricht",
          categories: {
            bug: "Bug",
            idea: "Idee",
            ui: "UI / UX",
            content: "Inhalt",
            other: "Sonstiges"
          },
          namePlaceholder: "Optionaler Anzeigename",
          emailPlaceholder: "Optionale Kontakt-E-Mail",
          messagePlaceholder:
            "Was sollte verbessert, repariert oder ergänzt werden? Je klarer dein Feedback ist, desto besser kann darauf reagiert werden.",
          submit: "Feedback senden",
          sending: "Wird gesendet...",
          success: "Danke, dein Feedback wurde gespeichert.",
          rejected:
            "Dieses Feedback konnte in der aktuellen Form nicht übernommen werden. Bitte formuliere es sachlich und app-bezogen.",
          failure: "Feedback konnte nicht gesendet werden."
        };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!message.trim() || saving) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          category,
          displayName,
          email,
          message,
          pagePath: pathname
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? text.failure);
      }

      toast.success(data.message ?? text.success);
      setMessage("");
      router.refresh();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : text.failure;
      toast.error(messageText.includes("nicht übernommen") || messageText.includes("could not be accepted") ? messageText : messageText || text.failure);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-border/50 bg-card/50 p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <MessageSquareText className="size-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{text.title}</h2>
          <p className="text-sm text-muted-foreground">{text.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{text.category}</label>
          <select
            value={category}
            onChange={event =>
              setCategory(event.target.value as "bug" | "idea" | "ui" | "content" | "other")
            }
            className="h-10 w-full rounded-xl border border-border/60 bg-card/60 px-3 text-sm shadow-sm transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {Object.entries(text.categories).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">{text.displayName}</label>
            <Input
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
              placeholder={text.namePlaceholder}
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{text.email}</label>
            <Input
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder={text.emailPlaceholder}
              type="email"
              maxLength={120}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{text.message}</label>
          <Textarea
            value={message}
            onChange={event => setMessage(event.target.value)}
            placeholder={text.messagePlaceholder}
            maxLength={2000}
          />
        </div>

        <Button type="submit" disabled={saving || !message.trim()} className="w-full sm:w-auto">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {saving ? text.sending : text.submit}
        </Button>
      </form>
    </div>
  );
}
