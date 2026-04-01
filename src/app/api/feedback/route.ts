import { NextResponse } from "next/server";
import { z } from "zod";

import { moderateFeedback } from "@/lib/ai/feedback-moderation";
import { isUnsafeFeedbackMessage } from "@/lib/security/prompt-injection";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getRateLimitIdentityKey, getRequestIp, isSameOriginRequest } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  email: z.string().email().optional().or(z.literal("")),
  displayName: z.string().trim().max(80).optional().or(z.literal("")),
  category: z.enum(["bug", "idea", "ui", "content", "other"]),
  message: z.string().trim().min(3).max(2000),
  pagePath: z.string().trim().max(200).optional().or(z.literal(""))
});

const OFF_TOPIC_REASON_PATTERNS = [
  /\boff[\s-]?topic\b/i,
  /\bunrelated\b/i,
  /\bnot\s+related\b/i,
  /\bnot\s+about\b/i,
  /\bkein(?:e|en|er)?\s+bezug\b/i
] as const;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const ip = getRequestIp(request);
  const rateLimit = checkRateLimit(getRateLimitIdentityKey("api-feedback-submit", ip), 8, 60_000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Zu viele Feedback-Anfragen. Bitte warte kurz." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  try {
    const payload = feedbackSchema.parse(await request.json());

    if (isUnsafeFeedbackMessage(payload.message)) {
      return NextResponse.json(
        {
          approved: false,
          message:
            "Dein Feedback konnte in dieser Form nicht übernommen werden. Bitte formuliere es sachlich und app-bezogen."
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const authResult = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const user = authResult.data.user;

    const moderation = await moderateFeedback({
      category: payload.category,
      message: payload.message
    });

    if (!moderation.allowed) {
      const isOffTopic = OFF_TOPIC_REASON_PATTERNS.some((pattern) => pattern.test(moderation.reason));

      return NextResponse.json(
        {
          approved: false,
          message: isOffTopic
            ? "Bitte sende Feedback mit klarem Bezug zur App (Funktionen, Inhalte, UX oder Fehler)."
            : "Dein Feedback konnte in dieser Form nicht übernommen werden. Bitte formuliere es sachlich und app-bezogen."
        },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClient();
    const { error } = await (adminClient.from("feedback_entries") as any).insert({
      user_id: user?.id ?? null,
      email: user?.email ?? (payload.email || null),
      display_name: payload.displayName || user?.user_metadata?.display_name || null,
      category: payload.category,
      message: payload.message,
      page_path: payload.pagePath || null,
      moderation_summary: moderation.summary
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      approved: true,
      message: "Danke, dein Feedback wurde gespeichert."
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Ungültige Eingabe." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feedback konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
}
