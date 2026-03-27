"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import {
  AGE_GATE_COOKIE_MAX_AGE,
  AGE_GATE_COOKIE_NAME,
  calculateAgeFromBirthDate,
  normalizeBirthDate,
  type AgeGateState
} from "@/lib/age-gate";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Viewer } from "@/types/auth";

interface AgeGatePromptProps {
  initialState: AgeGateState;
  user: Viewer | null;
}

const MONTH_LABELS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember"
] as const;

const selectClassName =
  "h-11 w-full rounded-xl border border-border/60 bg-card/60 px-3 text-sm shadow-sm transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40";

function persistBirthDateCookie(birthDate: string) {
  document.cookie = `${AGE_GATE_COOKIE_NAME}=${birthDate}; Max-Age=${AGE_GATE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

function parseBirthDateParts(birthDate: string | null) {
  if (!birthDate) {
    return { year: "", month: "", day: "" };
  }

  const [year, month, day] = birthDate.split("-");
  return {
    year: year ?? "",
    month: month ?? "",
    day: day ?? ""
  };
}

function pad(value: string) {
  return value.padStart(2, "0");
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function buildBirthDate(year: string, month: string, day: string) {
  if (!year || !month || !day) {
    return null;
  }

  return normalizeBirthDate(`${year}-${pad(month)}-${pad(day)}`);
}

export function AgeGatePrompt({ initialState, user }: AgeGatePromptProps) {
  const router = useRouter();
  const initialParts = useMemo(
    () => parseBirthDateParts(initialState.birthDate),
    [initialState.birthDate]
  );
  const [year, setYear] = useState(initialParts.year);
  const [month, setMonth] = useState(initialParts.month ? String(Number(initialParts.month)) : "");
  const [day, setDay] = useState(initialParts.day ? String(Number(initialParts.day)) : "");
  const [saving, setSaving] = useState(false);
  const syncedProfile = useRef(false);

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1;
  const currentDay = today.getUTCDate();

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

  const years = useMemo(
    () => Array.from({ length: 131 }, (_, index) => String(currentYear - index)),
    [currentYear]
  );

  const months = useMemo(() => {
    const maxMonth = Number(year) === currentYear ? currentMonth : 12;
    return Array.from({ length: maxMonth }, (_, index) => index + 1);
  }, [currentMonth, currentYear, year]);

  const days = useMemo(() => {
    if (!year || !month) {
      return [] as number[];
    }

    const numericYear = Number(year);
    const numericMonth = Number(month);

    if (!Number.isFinite(numericYear) || !Number.isFinite(numericMonth)) {
      return [] as number[];
    }

    const naturalDays = getDaysInMonth(numericYear, numericMonth);
    const maxDay =
      numericYear === currentYear && numericMonth === currentMonth
        ? Math.min(naturalDays, currentDay)
        : naturalDays;

    return Array.from({ length: maxDay }, (_, index) => index + 1);
  }, [currentDay, currentMonth, currentYear, month, year]);

  useEffect(() => {
    if (month && !months.includes(Number(month))) {
      setMonth("");
      setDay("");
      return;
    }

    if (day && !days.includes(Number(day))) {
      setDay("");
    }
  }, [day, days, month, months]);

  if (!initialState.needsPrompt) {
    return null;
  }

  const selectedBirthDate = buildBirthDate(year, month, day);
  const derivedAge = calculateAgeFromBirthDate(selectedBirthDate);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedBirthDate || derivedAge === null) {
      toast.error("Bitte wähle ein gültiges Geburtsdatum aus.");
      return;
    }

    setSaving(true);
    persistBirthDateCookie(selectedBirthDate);

    if (user && isSupabaseConfigured()) {
      const supabase = createSupabaseBrowserClient();
      const { error } = await (supabase.from("profiles") as any).upsert(
        {
          id: user.id,
          birth_date: selectedBirthDate
        },
        { onConflict: "id" }
      );

      if (error) {
        toast.error("Geburtsdatum konnte nicht im Profil gespeichert werden.");
        setSaving(false);
        return;
      }
    }

    toast.success(
      derivedAge >= 18
        ? "Geburtsdatum gespeichert. Alle Inhalte sind freigeschaltet."
        : "Geburtsdatum gespeichert. Inhalte werden altersgerecht gefiltert."
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
              Bitte wähle dein Geburtsdatum aus. Wir nutzen diese Angabe, um Inhalte mit höherer
              Altersfreigabe für Minderjährige auszublenden.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <label className="text-sm font-medium">Geburtsdatum</label>
            <div className="grid gap-3 sm:grid-cols-[1fr_1.1fr_1fr]">
              <select value={day} onChange={event => setDay(event.target.value)} className={selectClassName}>
                <option value="">Tag</option>
                {days.map(option => (
                  <option key={option} value={String(option)}>
                    {option}
                  </option>
                ))}
              </select>
              <select value={month} onChange={event => setMonth(event.target.value)} className={selectClassName}>
                <option value="">Monat</option>
                {months.map(option => (
                  <option key={option} value={String(option)}>
                    {MONTH_LABELS[option - 1]}
                  </option>
                ))}
              </select>
              <select value={year} onChange={event => setYear(event.target.value)} className={selectClassName}>
                <option value="">Jahr</option>
                {years.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/50 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p>
                  Die Angabe wird als Cookie gespeichert. Wenn du eingeloggt bist, wird sie
                  zusätzlich in deinem Profil hinterlegt.
                </p>
                {selectedBirthDate && derivedAge !== null ? (
                  <p className="text-foreground/90">
                    Ausgewählt: {selectedBirthDate} ({derivedAge} Jahre)
                  </p>
                ) : (
                  <p>Bitte wähle Tag, Monat und Jahr aus.</p>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={saving || !selectedBirthDate}>
            {saving ? "Speichere..." : "Geburtsdatum speichern und fortfahren"}
          </Button>
        </form>
      </div>
    </div>
  );
}
