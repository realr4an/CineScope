import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-shell">
      <Header />
      <main className="page-content pb-16 pt-8">
        <div className="content-container">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
