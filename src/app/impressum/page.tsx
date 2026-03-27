import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { getPreferredLocale } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPreferredLocale();

  return {
    title: locale === "en" ? "Imprint | CineScope" : "Impressum | CineScope",
    description: locale === "en" ? "Legal notice for CineScope" : "Impressum von CineScope"
  };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-border/50 bg-card/50 p-5 sm:p-6">
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export default async function ImpressumPage() {
  const locale = await getPreferredLocale();
  const text =
    locale === "en"
      ? {
          title: "Imprint",
          subtitle: "Information according to Section 5 of the German Digital Services Act (DDG)",
          providerTitle: "Provider and responsible party",
          contactTitle: "Contact",
          contactHint: "Please use email as the preferred contact channel.",
          editorialTitle: "Responsible for editorial content",
          contentLiabilityTitle: "Liability for content",
          contentLiability:
            "The content of this website was created with the greatest possible care. However, no guarantee is given for the accuracy, completeness or timeliness of the content.",
          linksLiabilityTitle: "Liability for links",
          linksLiability:
            "This website contains links to external third-party websites whose content is beyond our control. Therefore, no liability is assumed for such external content. The respective provider or operator of the linked pages is always responsible for their content.",
          country: "Germany",
          emailLabel: "Email"
        }
      : {
          title: "Impressum",
          subtitle: "Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)",
          providerTitle: "Anbieter und Verantwortlicher",
          contactTitle: "Kontakt",
          contactHint: "Die Kontaktaufnahme erfolgt bevorzugt per E-Mail.",
          editorialTitle: "Verantwortlich für redaktionelle Inhalte",
          contentLiabilityTitle: "Haftung für Inhalte",
          contentLiability:
            "Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird jedoch keine Gewähr übernommen.",
          linksLiabilityTitle: "Haftung für Links",
          linksLiability:
            "Diese Website enthält Links zu externen Websites Dritter, auf deren Inhalte kein Einfluss besteht. Für diese fremden Inhalte wird daher keine Gewähr übernommen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.",
          country: "Deutschland",
          emailLabel: "E-Mail"
        };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{text.title}</h1>
          <p className="text-sm text-muted-foreground">{text.subtitle}</p>
        </div>

        <Section title={text.providerTitle}>
          <p>
            {"Duncan Scholle"}
            <br />
            {"Niederadener Straße 135"}
            <br />
            {"44532 Lünen"}
            <br />
            {text.country}
          </p>
        </Section>

        <Section title={text.contactTitle}>
          <p>
            {`${text.emailLabel}: `}
            <a className="text-foreground underline underline-offset-4" href="mailto:realr4an@gmail.com">
              {"realr4an@gmail.com"}
            </a>
          </p>
          <p>{text.contactHint}</p>
        </Section>

        <Section title={text.editorialTitle}>
          <p>
            {"Duncan Scholle"}
            <br />
            {"Niederadener Straße 135"}
            <br />
            {"44532 Lünen"}
            <br />
            {text.country}
          </p>
        </Section>

        <Section title={text.contentLiabilityTitle}>
          <p>{text.contentLiability}</p>
        </Section>

        <Section title={text.linksLiabilityTitle}>
          <p>{text.linksLiability}</p>
        </Section>
      </div>
    </AppShell>
  );
}
