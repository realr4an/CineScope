import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/states/state-components";
import { getServerDictionary } from "@/lib/i18n/server";

export async function UnderDevelopmentContent({ loginHref }: { loginHref?: string } = {}) {
  const { dictionary } = await getServerDictionary();
  const isEnglish = dictionary.common.language === "Language";

  return (
    <EmptyState
      title={isEnglish ? "Currently under development" : "Derzeit nur in Entwicklung"}
      description={
        isEnglish
          ? "This project is currently available only to approved admin accounts or explicitly approved users. Please sign in to continue."
          : "Dieses Projekt ist aktuell nur für Admin-Accounts oder explizit freigeschaltete Nutzer verfügbar. Bitte melde dich an, um fortzufahren."
      }
      action={loginHref ? { label: isEnglish ? "Go to login" : "Zum Login", href: loginHref } : undefined}
    />
  );
}

export default async function UnderDevelopmentPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const rawRedirectTo = params?.redirectTo;
  const redirectTo = Array.isArray(rawRedirectTo) ? rawRedirectTo[0] : rawRedirectTo;
  const loginHref = redirectTo
    ? `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/auth/login";

  return (
    <AppShell>
      <UnderDevelopmentContent loginHref={loginHref} />
    </AppShell>
  );
}
