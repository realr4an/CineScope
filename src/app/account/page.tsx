import { redirect } from "next/navigation";
import { Mail, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/states/state-components";
import { AccountSettingsForm } from "@/features/account/account-settings-form";
import { PasswordChangeForm } from "@/features/account/password-change-form";
import { getPublicEnv } from "@/lib/env";
import { getServerDictionary } from "@/lib/i18n/server";
import { getViewer } from "@/lib/supabase/queries";

export default async function AccountPage() {
  const { locale } = await getServerDictionary();

  if (!getPublicEnv().success) {
    return (
      <AppShell>
        <ErrorState
          title={locale === "en" ? "Supabase is not configured yet" : "Supabase ist noch nicht konfiguriert"}
          description={
            locale === "en"
              ? "Add the required environment variables before opening account settings."
              : "Lege zuerst die benötigten Umgebungsvariablen an, bevor du die Account-Einstellungen öffnest."
          }
        />
      </AppShell>
    );
  }

  const viewer = await getViewer();

  if (!viewer) {
    redirect("/auth/login?next=/account");
  }

  const text =
    locale === "en"
      ? {
          title: "Account settings",
          description: "Manage your account details, password and stored defaults in one place.",
          overviewTitle: "Overview",
          overviewDescription:
            "Your email stays read-only. Other personal settings can be updated anytime.",
          emailLabel: "Signed in as",
          birthDateLabel: "Stored date of birth",
          defaultsTitle: "Saved defaults",
          defaultsDescription:
            "These values are reused across where-to-watch, search and discovery flows.",
          securityTitle: "Security",
          securityDescription: "Update your password without leaving the app.",
          notSet: "Not set"
        }
      : {
          title: "Account-Einstellungen",
          description:
            "Verwalte deine Kontodaten, dein Passwort und gespeicherte Standardwerte an einem Ort.",
          overviewTitle: "Überblick",
          overviewDescription:
            "Deine E-Mail bleibt schreibgeschützt. Andere persönliche Einstellungen kannst du jederzeit anpassen.",
          emailLabel: "Angemeldet als",
          birthDateLabel: "Gespeichertes Geburtsdatum",
          defaultsTitle: "Gespeicherte Standards",
          defaultsDescription:
            "Diese Werte werden in Where-to-watch-, Such- und Discover-Ansichten wiederverwendet.",
          securityTitle: "Sicherheit",
          securityDescription: "Aktualisiere dein Passwort direkt in der App.",
          notSet: "Nicht gesetzt"
        };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{text.title}</h1>
          <p className="text-muted-foreground">{text.description}</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border/50 bg-card/50 p-6">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Mail className="size-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{text.overviewTitle}</h2>
                  <p className="text-sm text-muted-foreground">{text.overviewDescription}</p>
                </div>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/40 bg-background/50 p-4">
                  <dt className="text-sm text-muted-foreground">{text.emailLabel}</dt>
                  <dd className="mt-2 text-sm font-medium text-foreground">
                    {viewer.email ?? text.notSet}
                  </dd>
                </div>
                <div className="rounded-2xl border border-border/40 bg-background/50 p-4">
                  <dt className="text-sm text-muted-foreground">{text.birthDateLabel}</dt>
                  <dd className="mt-2 text-sm font-medium text-foreground">
                    {viewer.birthDate ?? text.notSet}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[2rem] border border-border/50 bg-card/50 p-6">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <SlidersHorizontal className="size-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{text.defaultsTitle}</h2>
                  <p className="text-sm text-muted-foreground">{text.defaultsDescription}</p>
                </div>
              </div>
              <AccountSettingsForm viewer={viewer} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/50 bg-card/50 p-6">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">{text.securityTitle}</h2>
                <p className="text-sm text-muted-foreground">{text.securityDescription}</p>
              </div>
            </div>
            <PasswordChangeForm />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
