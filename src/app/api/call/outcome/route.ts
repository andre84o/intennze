export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { callOutcomeLimiter, tryLimit, rateLimitHeaders } from "@/lib/ratelimit";

const ALLOWED_OUTCOMES = ["interested", "call_back", "no_answer", "not_interested"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTE = 2000;

// Normalises a user-supplied reminder date to YYYYMMDD (the RPC's expected
// format). Accepts YYYYMMDD or YYYY-MM-DD. Returns null when absent, or
// undefined when present-but-invalid.
function normalizeReminderDate(v: unknown): string | null | undefined {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const s = v.replace(/-/g, "");
  if (!/^\d{8}$/.test(s)) return undefined;
  const m = +s.slice(4, 6);
  const d = +s.slice(6, 8);
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return s;
}

// Normalises a user-supplied reminder time to HHMM. Accepts HHMM or HH:MM.
// Returns null when absent, or undefined when present-but-invalid.
function normalizeReminderTime(v: unknown): string | null | undefined {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const s = v.replace(":", "");
  if (!/^\d{4}$/.test(s)) return undefined;
  const h = +s.slice(0, 2);
  const min = +s.slice(2, 4);
  if (h > 23 || min > 59) return undefined;
  return s;
}

// POST /api/call/outcome — records a single call outcome via the atomic
// record_call_outcome RPC. Never triggers Meta Conversions.
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // 1. Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });
  }

  // 2. Rate limit — FAIL-CLOSED in production if the limiter is not configured.
  if (callOutcomeLimiter === null) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Rate limiter saknas" }, { status: 503 });
    }
    console.warn("[call/outcome] rate limiter not configured — continuing (dev only)");
  } else {
    const limit = await tryLimit(callOutcomeLimiter, user.id);
    if (limit && !limit.success) {
      return NextResponse.json(
        { error: "För många förfrågningar. Vänta en stund och försök igen." },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }
  }

  // 3. Parse + validate body
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 });
  }

  const sessionId = body.session_id;
  const customerId = body.customer_id;
  const activeCallId = body.active_call_id;
  const requestId = body.request_id;
  const outcome = body.outcome;
  const note = body.note;

  const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
  if (!isUuid(sessionId) || !isUuid(customerId) || !isUuid(activeCallId) || !isUuid(requestId)) {
    return NextResponse.json({ error: "Ogiltiga id-fält" }, { status: 400 });
  }
  if (typeof outcome !== "string" || !(ALLOWED_OUTCOMES as readonly string[]).includes(outcome)) {
    return NextResponse.json({ error: "Ogiltigt utfall" }, { status: 400 });
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "Ogiltig anteckning" }, { status: 400 });
  }
  const noteStr = typeof note === "string" ? note.slice(0, MAX_NOTE) : null;

  // Reminder date/time (only used by call_back + interested).
  const reminderDate = normalizeReminderDate(body.reminder_date);
  const reminderTime = normalizeReminderTime(body.reminder_time);
  if (reminderDate === undefined || reminderTime === undefined) {
    return NextResponse.json({ error: "Ogiltigt datum eller tid" }, { status: 400 });
  }
  if (outcome === "call_back") {
    if (!reminderDate || !reminderTime) {
      return NextResponse.json({ error: "Datum och tid krävs för Ring tillbaka" }, { status: 400 });
    }
    if (!noteStr || noteStr.trim() === "") {
      return NextResponse.json({ error: "Anteckning krävs för Ring tillbaka" }, { status: 400 });
    }
  } else if (outcome === "interested") {
    if ((reminderDate && !reminderTime) || (!reminderDate && reminderTime)) {
      return NextResponse.json({ error: "Ange både datum och tid" }, { status: 400 });
    }
  } else {
    // no_answer / not_interested never accept a user reminder.
    if (reminderDate || reminderTime) {
      return NextResponse.json({ error: "Datum/tid stöds inte för detta utfall" }, { status: 400 });
    }
  }

  // 4. Consistency checks before the write (defense-in-depth; the RPC re-checks
  //    under row locks). RLS scopes the session to the authenticated agent.
  const { data: session } = await supabase
    .from("call_sessions")
    .select("agent_id, active_customer_id, active_call_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.agent_id !== user.id) {
    return NextResponse.json({ error: "Ingen aktiv session" }, { status: 409 });
  }
  if (session.active_call_id !== activeCallId || session.active_customer_id !== customerId) {
    return NextResponse.json({ error: "Sessionen har uppdaterats — ladda om" }, { status: 409 });
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle();
  if (!customer) {
    return NextResponse.json({ error: "Kunden hittades inte" }, { status: 409 });
  }

  // 5. Atomic write via RPC
  const { data, error } = await supabase.rpc("record_call_outcome", {
    p_session_id: sessionId,
    p_customer_id: customerId,
    p_active_call_id: activeCallId,
    p_outcome: outcome,
    p_request_id: requestId,
    p_note: noteStr,
    p_reminder_date: reminderDate,
    p_reminder_time: reminderTime,
  });

  if (error) {
    // Custom SQLSTATEs from the RPC: PT409 = stale/conflict, PT400 = bad input.
    if (error.code === "PT409") {
      return NextResponse.json({ error: "Sessionen har uppdaterats — ladda om" }, { status: 409 });
    }
    if (error.code === "PT400") {
      return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 });
    }
    console.error("[call/outcome] RPC error:", error.code, error.message);
    return NextResponse.json({ error: "Kunde inte spara utfallet" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
