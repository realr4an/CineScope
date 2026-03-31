"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe2, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/features/i18n/language-provider";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEFAULT_WATCH_REGION } from "@/lib/tmdb/watch-provider-preference";
import type { Viewer } from "@/types/auth";
import type { WatchRegion } from "@/types/watch-providers";

const selectClassName =
  "h-10 w-full rounded-xl border border-border/60 bg-card/60 px-3 text-sm shadow-sm transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60";

async function getJson<T>(input: RequestInfo | URL) {
  const response = await fetch(input, { cache: "no-store" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data as T;
}

export function AccountSettingsForm({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [displayName, setDisplayName] = useState(viewer.displayName ?? "");
  const [selectedRegion, setSelectedRegion] = useState(
    viewer.preferredRegion ?? DEFAULT_WATCH_REGION
  );
  const [regions, setRegions] = useState<WatchRegion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const text = useMemo(
    () =>
      locale === "en"
        ? {
            email: "Email",
            displayName: "Display name",
            displayNamePlaceholder: "How should we address you?",
            defaultCountry: "Default country",
            loadingCountries: "Loading countries...",
            countryError: "Countries could not be loaded.",
            countryHint: "Used as the default for where-to-watch, search and category filters.",
            save: "Save settings",
            saving: "Saving...",
            success: "Settings saved.",
            failure: "Settings could not be saved."
          }
        : {
            email: "E-Mail",
            displayName: "Anzeigename",
            displayNamePlaceholder: "Wie sollen wir dich ansprechen?",
            defaultCountry: "Standardland",
            loadingCountries: "Länder werden geladen...",
            countryError: "Länder konnten nicht geladen werden.",
            countryHint:
              "Wird als Standard für Where to watch, Suche und Kategorien verwendet.",
            save: "Einstellungen speichern",
            saving: "Speichere...",
            success: "Einstellungen gespeichert.",
            failure: "Einstellungen konnten nicht gespeichert werden."
          },
    [locale]
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await getJson<{ regions: WatchRegion[] }>("/api/watch-providers/regions");

        if (!active) {
          return;
        }

        setRegions(data.regions);
        setRegionsError(null);
      } catch (error) {
        if (!active) {
          return;
        }

        setRegionsError(error instanceof Error ? error.message : text.countryError);
      } finally {
        if (active) {
          setRegionsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [text.countryError]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error(text.failure);
      return;
    }

    setSaving(true);
    const supabase = createSupabaseBrowserClient();

    const [profileResult, preferenceResult] = await Promise.all([
      (supabase.from("profiles") as any).upsert(
        {
          id: viewer.id,
          display_name: displayName.trim() || null
        },
        { onConflict: "id" }
      ),
      (supabase.from("user_preferences") as any).upsert(
        {
          user_id: viewer.id,
          preferred_region: selectedRegion
        },
        { onConflict: "user_id" }
      )
    ]);

    if (profileResult.error || preferenceResult.error) {
      toast.error(text.failure);
      setSaving(false);
      return;
    }

    savePreferredRegion(selectedRegion);
    toast.success(text.success);
    router.refresh();
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">{text.email}</label>
        <Input value={viewer.email ?? ""} readOnly disabled />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{text.displayName}</label>
        <Input
          value={displayName}
          onChange={event => setDisplayName(event.target.value)}
          placeholder={text.displayNamePlaceholder}
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{text.defaultCountry}</label>
        <div className="relative">
          <Globe2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={selectedRegion}
            onChange={event => setSelectedRegion(event.target.value)}
            className={`${selectClassName} pl-10`}
            disabled={regionsLoading || saving || !regions.length}
          >
            {regionsLoading ? (
              <option value={selectedRegion}>{text.loadingCountries}</option>
            ) : regions.length ? (
              regions.map(region => (
                <option key={region.regionCode} value={region.regionCode}>
                  {region.regionName}
                </option>
              ))
            ) : (
              <option value={selectedRegion}>{selectedRegion}</option>
            )}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          {regionsError ? regionsError : text.countryHint}
        </p>
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        {saving ? text.saving : text.save}
      </Button>
    </form>
  );
}
