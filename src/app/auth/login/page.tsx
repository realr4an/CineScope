import { AppShell } from "@/components/layout/app-shell";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-md rounded-[2rem] border border-border/50 bg-card/50 p-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Login</h1>
          <p className="text-sm text-muted-foreground">
            Melde dich an, um deine Watchlist persistent zu speichern.
          </p>
        </div>
        <LoginForm />
      </div>
    </AppShell>
  );
}
