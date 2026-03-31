"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Globe2, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AGE_GATE_COOKIE_MAX_AGE,
  AGE_GATE_COOKIE_NAME,
  normalizeBirthDate
} from "@/lib/age-gate";
import { useLanguage } from "@/features/i18n/language-provider";
import { savePreferredRegion } from "@/features/watch-providers/region-preference";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { DEFAULT_WATCH_REGION } from "@/lib/tmdb/watch-provider-preference";
import type { Viewer } from "@/types/auth";
import type { WatchRegion } from "@/types/watch-providers";

const selectClassName =
  "h-10 w-full rounded-xl border border-border/60 bg-card/60 px-3 text-sm shadow-sm transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60";

const MONTH_LABELS = {
  de: [
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
  ],
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]
} as const;

function parseBirthDateParts(birthDate: string | null) {
  if (!birthDate) {
    return { year: "", month: "", day: "" };
  }

  const [year, month, day] = birthDate.split("-");
  return {
    year: year ?? "",
    month: month ? String(Number(month)) : "",
    day: day ? String(Number(day)) : ""
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

function persistBirthDateCookie(birthDate: string) {
  document.cookie = `${AGE_GATE_COOKIE_NAME}=${birthDate}; Max-Age=${AGE_GATE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
}

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
  const initialBirthParts = useMemo(() => parseBirthDateParts(viewer.birthDate), [viewer.birthDate]);
  const [birthYear, setBirthYear] = useState(initialBirthParts.year);
  const [birthMonth, setBirthMonth] = useState(initialBirthParts.month);
  const [birthDay, setBirthDay] = useState(initialBirthParts.day);
  const [regions, setRegions] = useState<WatchRegion[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionsError, setRegionsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const today = useMemo(() => new Date(), []);
  const currentYear = today.getUTCFullYear();
  const currentMonth = today.getUTCMonth() + 1;
  const currentDay = today.getUTCDate();

  const text = useMemo(
    () =>
      locale === "en"
        ? {
            email: "Email",
            displayName: "Display name",
            displayNamePlaceholder: "How should we address you?",
            birthDate: "Date of birth",
            year: "Year",
            month: "Month",
            day: "Day",
            birthDateHint:
              "Used for age filtering and stored in both your profile and a browser cookie.",
            defaultCountry: "Default country",
            loadingCountries: "Loading countries...",
            countryError: "Countries could not be loaded.",
            countryHint: "Used as the default for where-to-watch, search and category filters.",
            invalidBirthDate: "Please select a valid date of birth.",
            save: "Save settings",
            saving: "Saving...",
            success: "Settings saved.",
            failure: "Settings could not be saved."
          }
        : {
            email: "E-Mail",
            displayName: "Anzeigename",
            displayNamePlaceholder: "Wie sollen wir dich ansprechen?",
            birthDate: "Geburtsdatum",
            year: "Jahr",
            month: "Monat",
            day: "Tag",
            birthDateHint:
              "Wird für die Altersfilterung verwendet und sowohl im Profil als auch im Browser-Cookie gespeichert.",
            defaultCountry: "Standardland",
            loadingCountries: "Länder werden geladen...",
            countryError: "Länder konnten nicht geladen werden.",
            countryHint:
              "Wird als Standard für Where to watch, Suche und Kategorien verwendet.",
            invalidBirthDate: "Bitte wähle ein gültiges Geburtsdatum aus.",
            save: "Einstellungen speichern",
            saving: "Speichere...",
            success: "Einstellungen gespeichert.",
            failure: "Einstellungen konnten nicht gespeichert werden."
          },
    [locale]
  );

  const years = useMemo(
    () => Array.from({ length: 131 }, (_, index) => String(currentYear - index)),
    [currentYear]
  );

  const months = useMemo(() => {
    if (!birthYear) {
      return [] as number[];
    }

    const maxMonth = Number(birthYear) === currentYear ? currentMonth : 12;
    return Array.from({ length: maxMonth }, (_, index) => index + 1);
  }, [birthYear, currentMonth, currentYear]);

  const days = useMemo(() => {
    if (!birthYear || !birthMonth) {
      return [] as number[];
    }

    const numericYear = Number(birthYear);
    const numericMonth = Number(birthMonth);

    if (!Number.isFinite(numericYear) || !Number.isFinite(numericMonth)) {
      return [] as number[];
    }

    const naturalDays = getDaysInMonth(numericYear, numericMonth);
    const maxDay =
      numericYear === currentYear && numericMonth === currentMonth
        ? Math.min(naturalDays, currentDay)
        : naturalDays;

    return Array.from({ length: maxDay }, (_, index) => index + 1);
  }, [birthMonth, birthYear, currentDay, currentMonth, currentYear]);

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

  useEffect(() => {
    if (!birthYear) {
      if (birthMonth) {
        setBirthMonth("");
      }
      if (birthDay) {
        setBirthDay("");
      }
      return;
    }

    if (birthMonth && !months.includes(Number(birthMonth))) {
      setBirthMonth("");
      setBirthDay("");
      return;
    }

    if (!birthMonth && birthDay) {
      setBirthDay("");
      return;
    }

    if (birthDay && !days.includes(Number(birthDay))) {
      setBirthDay("");
    }
  }, [birthDay, birthMonth, birthYear, days, months]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isSupabaseConfigured()) {
      toast.error(text.failure);
      return;
    }

    const birthDate = buildBirthDate(birthYear, birthMonth, birthDay);

    if (!birthDate) {
      toast.error(text.invalidBirthDate);
      return;
    }

    setSaving(true);
    const supabase = createSupabaseBrowserClient();

    const [profileResult, preferenceResult] = await Promise.all([
      (supabase.from("profiles") as any).upsert(
        {
          id: viewer.id,
          display_name: displayName.trim() || null,
          birth_date: birthDate
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

    persistBirthDateCookie(birthDate);
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

      <div className="space-y-3">
        <label className="text-sm font-medium">{text.birthDate}</label>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span>1</span>
              <ChevronRight className="size-3" />
              <span>{text.year}</span>
            </div>
            <select
              value={birthYear}
              onChange={event => setBirthYear(event.target.value)}
              className={selectClassName}
            >
              <option value="">{text.year}</option>
              {years.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span>2</span>
              <ChevronRight className="size-3" />
              <span>{text.month}</span>
            </div>
            <select
              value={birthMonth}
              onChange={event => setBirthMonth(event.target.value)}
              className={selectClassName}
              disabled={!birthYear}
            >
              <option value="">{text.month}</option>
              {months.map(option => (
                <option key={option} value={String(option)}>
                  {MONTH_LABELS[locale][option - 1]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <span>3</span>
              <ChevronRight className="size-3" />
              <span>{text.day}</span>
            </div>
            <select
              value={birthDay}
              onChange={event => setBirthDay(event.target.value)}
              className={selectClassName}
              disabled={!birthYear || !birthMonth}
            >
              <option value="">{text.day}</option>
              {days.map(option => (
                <option key={option} value={String(option)}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{text.birthDateHint}</p>
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
