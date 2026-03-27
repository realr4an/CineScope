import { AppShell } from "@/components/layout/app-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md rounded-[2rem] border border-border/50 bg-card/50 p-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Passwort vergessen</h1>
          <p className="text-sm text-muted-foreground">
            Wir senden dir einen sicheren Link, um dein Passwort zurueckzusetzen.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </AppShell>
  );
}
