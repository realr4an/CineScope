import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeBirthDate } from "@/lib/age-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRateLimitIdentityKey, getRequestIp, isSameOriginRequest } from "@/lib/security/request";

const accountSettingsSchema = z.object({
  displayName: z.string().trim().max(80).optional().or(z.literal("")),
  birthDate: z
    .string()
    .trim()
    .refine(value => !!normalizeBirthDate(value), "Bitte wähle ein gültiges Geburtsdatum aus."),
  preferredRegion: z.string().trim().length(2)
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase ist nicht konfiguriert." },
        { status: 500 }
      );
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(
      getRateLimitIdentityKey("api-account-settings", ip, user.id),
      20,
      60_000
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte warte kurz." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds)
          }
        }
      );
    }

    const payload = accountSettingsSchema.parse(await request.json());

    const [profileResult, preferenceResult] = await Promise.all([
      (supabase.from("profiles") as any).upsert(
        {
          id: user.id,
          display_name: payload.displayName || null,
          birth_date: payload.birthDate
        },
        { onConflict: "id" }
      ),
      (supabase.from("user_preferences") as any).upsert(
        {
          user_id: user.id,
          preferred_region: payload.preferredRegion.toUpperCase()
        },
        { onConflict: "user_id" }
      )
    ]);

    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }

    if (preferenceResult.error) {
      throw new Error(preferenceResult.error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Einstellungen konnten nicht gespeichert werden."
      },
      { status: 500 }
    );
  }
}
