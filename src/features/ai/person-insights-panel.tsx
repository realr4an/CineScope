"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
import { useLanguage } from "@/features/i18n/language-provider";
import { Button } from "@/components/ui/button";

type PersonInsightsResponse = { mode: "person_insights"; data: { summary: string; highlights: string[] } };

export function AIPersonInsightsPanel({ personId }: { personId: number }) {
  const { locale } = useLanguage();
  const text = locale === "en"
    ? {
        error: "The AI person insight could not be loaded.",
        title: "AI insight",
        description: "A short explanation of what this person is known for and which projects define them.",
        button: "Generate insight"
      }
    : {
        error: "Die KI-Einordnung zur Person konnte nicht geladen werden.",
        title: "KI-Einordnung",
        description: "Kurze Einordnung, wofür diese Person bekannt ist und welche Projekte sie prägen.",
        button: "Einordnen"
      };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PersonInsightsResponse["data"] | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await postAIAction<PersonInsightsResponse>({ mode: "person_insights", personId }, text.error);
      setResult(response.data);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : text.error;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIPanelShell title={text.title} description={text.description} actions={<Button variant="outline" size="sm" onClick={load} disabled={loading}>{loading ? <RefreshCw className="size-4 animate-spin" /> : null}{text.button}</Button>}>
      <div className="space-y-4">
        {error ? <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
        {result ? <div className="space-y-3"><p className="text-sm text-muted-foreground">{result.summary}</p><ul className="space-y-2 text-sm text-muted-foreground">{result.highlights.map(highlight => <li key={highlight}>- {highlight}</li>)}</ul></div> : null}
      </div>
    </AIPanelShell>
  );
}
