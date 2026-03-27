import { AppShell } from "@/components/layout/app-shell";
import { getServerDictionary } from "@/lib/i18n/server";
import { LoginForm } from "@/features/auth/login-form";

export default async function LoginPage() {
  const { dictionary } = await getServerDictionary();

  return (
    <AppShell>
      <div className="mx-auto max-w-md rounded-[2rem] border border-border/50 bg-card/50 p-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{dictionary.authPage.loginTitle}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.authPage.loginDescription}</p>
        </div>
        <LoginForm />
      </div>
    </AppShell>
  );
}
