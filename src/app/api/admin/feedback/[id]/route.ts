import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRateLimitIdentityKey, getRequestIp, isSameOriginRequest } from "@/lib/security/request";

const feedbackEntryIdSchema = z.string().uuid();

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
    }

    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(
      getRateLimitIdentityKey("api-admin-feedback-delete", ip, user.id),
      30,
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

    const parsedId = feedbackEntryIdSchema.parse((await params).id);

    const { data: profile, error: profileError } = await (supabase.from("profiles") as any)
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admin-Zugriff erforderlich." }, { status: 403 });
    }

    const adminClient = createSupabaseAdminClient();
    const { error } = await (adminClient.from("feedback_entries") as any)
      .delete()
      .eq("id", parsedId);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, id: parsedId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Ungültige Feedback-ID." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feedback konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
}
