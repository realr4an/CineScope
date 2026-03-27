"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import {
  AGE_GATE_COOKIE_MAX_AGE,
  AGE_GATE_COOKIE_NAME,
  calculateAgeFromBirthDate,
  deriveBirthDateFromAge,
  normalizeBirthDate,
  type AgeGateState
} from "@/lib/age-gate";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Viewer } from "@/types/auth";

interface AgeGatePromptProps {
  initialState: AgeGateState;
  user: Viewer | null;
}

function persistBirthDateCookie(birthDate: string) {
  document.cookie = `${AGE_GATE_COOKIE_NAME}=${birthDate}; Max-Age=${AGE_GATE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

export function AgeGatePrompt({ initialState, user }: AgeGatePromptProps) {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState(initialState.birthDate ?? "");
  const [ageYears, setAgeYears] = useState("");
  const [saving, setSaving] = useState(false);
  const syncedProfile = useRef(false);

  useEffect(() => {
    if (!user || user.birthDate || !initialState.birthDate || syncedProfile.current) {
      return;
    }

    if (!isSupabaseConfigured()) {
      return;
    }

    syncedProfile.current = true;

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      await (supabase.from("profiles") as any).upsert(
        {
          id: user.id,
          birth_date: initialState.birthDate
        },
        { onConflict: "id" }
      );
    })();
  }, [initialState.birthDate, user]);

  if (!initialState.needsPrompt) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedBirthDate = normalizeBirthDate(birthDate);
    const numericAge = ageYears.trim() ? Number(ageYears) : null;
    const derivedBirthDate =
      normalizedBirthDate ??
      (numericAge !== null && Number.isFinite(numericAge)
        ? deriveBirthDateFromAge(Math.floor(numericAge))
        : null);
    const derivedAge = calculateAgeFromBirthDate(derivedBirthDate);

    if (!derivedBirthDate || derivedAge === null) {
      toast.error("Bitte gib ein gueltiges Geburtsdatum oder Alter an.");
      return;
    }

    setSaving(true);
    persistBirthDateCookie(derivedBirthDate);

    if (user && isSupabaseConfigured()) {
      const supabase = createSupabaseBrowserClient();
      const { error } = await (supabase.from("profiles") as any).upsert(
        {
          id: user.id,
          birth_date: derivedBirthDate
        },
        { onConflict: "id" }
      );

      if (error) {
        toast.error("Alter konnte nicht im Profil gespeichert werden.");
        setSaving(false);
        return;
      }
    }

    toast.success(
      derivedAge >= 18
        ? "Alter gespeichert. Alle Inhalte sind freigeschaltet."
        : "Alter gespeichert. Inhalte werden altersgerecht gefiltert."
    );

    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-border/60 bg-background p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldAlert className="size-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Jugendschutz</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Bitte gib dein Geburtsdatum oder dein Alter an. Wir nutzen diese Angabe,
              um Inhalte mit hoeherer Altersfreigabe fuer Minderjaehrige auszublenden.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="birth-date">
                Geburtsdatum
              </label>
              <Input
                id="birth-date"
                type="date"
                value={birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={event => setBirthDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="age-years">
                Oder Alter in Jahren
              </label>
              <Input
                id="age-years"
                inputMode="numeric"
                min={0}
                max={130}
                placeholder="z. B. 16"
                value={ageYears}
                onChange={event => setAgeYears(event.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 text-sm text-muted-foreground">
            Die Angabe wird als Cookie gespeichert. Wenn du eingeloggt bist, wird sie
            zusaetzlich in deinem Profil hinterlegt.
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Speichere..." : "Alter speichern und fortfahren"}
          </Button>
        </form>
      </div>
    </div>
  );
}
