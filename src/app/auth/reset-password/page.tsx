import { AppShell } from "@/components/layout/app-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md rounded-[2rem] border border-border/50 bg-card/50 p-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Neues Passwort setzen</h1>
          <p className="text-sm text-muted-foreground">
            Verwende den Link aus deiner E-Mail, um hier ein neues Passwort zu speichern.
          </p>
        </div>
        <ResetPasswordForm />
      </div>
    </AppShell>
  );
}
