import { AppShell } from "@/components/layout/app-shell";
import { SignupForm } from "@/features/auth/signup-form";

export default function SignupPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md rounded-[2rem] border border-border/50 bg-card/50 p-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Registrieren</h1>
          <p className="text-sm text-muted-foreground">
            Erstelle ein Konto für eine persönliche Watchlist und zukünftige Personalisierung.
          </p>
        </div>
        <SignupForm />
      </div>
    </AppShell>
  );
}
