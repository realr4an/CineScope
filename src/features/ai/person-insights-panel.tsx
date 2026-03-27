"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AIPanelShell } from "@/features/ai/ai-primitives";
import { postAIAction } from "@/features/ai/client";
import { Button } from "@/components/ui/button";

type PersonInsightsResponse = {
  mode: "person_insights";
  data: {
    summary: string;
    highlights: string[];
  };
};

export function AIPersonInsightsPanel({
  personId
}: {
  personId: number;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PersonInsightsResponse["data"] | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await postAIAction<PersonInsightsResponse>(
        {
          mode: "person_insights",
          personId
        },
        "Die KI-Einordnung zur Person konnte nicht geladen werden."
      );

      setResult(response.data);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Die KI-Einordnung zur Person konnte nicht geladen werden.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AIPanelShell
      title="KI-Einordnung"
      description="Kurze Einordnung, wofür diese Person bekannt ist und welche Projekte sie prägen."
      actions={
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <RefreshCw className="size-4 animate-spin" /> : null}
          Einordnen
        </Button>
      }
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{result.summary}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {result.highlights.map(highlight => (
                <li key={highlight}>- {highlight}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AIPanelShell>
  );
}
