export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { callSessionLimiter, tryLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { isUuid, minimalLead, nextVersion, pickFirstCallable } from "@/lib/callSession";

const MAX_LEAD_ORDER = 1000;

// POST /api/call/start — seed a point-in-time snapshot of the desktop's visible
// lead order and activate the first callable lead. No auto-dialing, no Meta.
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });
  }

  const limit = await tryLimit(callSessionLimiter, user.id);
  if (limit && !limit.success) {
    return NextResponse.json(
      { error: "För många förfrågningar. Vänta en stund och försök igen." },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 });
  }

  const raw = body.lead_order;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_LEAD_ORDER) {
    return NextResponse.json({ error: "Ogiltig lead_order" }, { status: 400 });
  }
  const seen = new Set<string>();
  const leadOrder: string[] = [];
  for (const v of raw) {
    if (!isUuid(v)) return NextResponse.json({ error: "Ogiltig lead_order" }, { status: 400 });
    if (!seen.has(v)) {
      seen.add(v);
      leadOrder.push(v);
    }
  }

  const picked = await pickFirstCallable(supabase, leadOrder, 0);
  const newCallId = picked ? randomUUID() : null;
  const version = await nextVersion(supabase, user.id);

  const { error: upsertErr } = await supabase
    .from("call_sessions")
    .upsert(
      {
        agent_id: user.id,
        lead_order: leadOrder,
        lead_index: picked ? picked.index : leadOrder.length,
        active_customer_id: picked ? picked.id : null,
        active_call_id: newCallId,
        state: picked ? "dialing" : "idle",
        version,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id" }
    );

  if (upsertErr) {
    console.error("[call/start] upsert error:", upsertErr.message);
    return NextResponse.json({ error: "Kunde inte starta session" }, { status: 500 });
  }

  if (!picked) {
    return NextResponse.json({ none: true, version });
  }

  const lead = await minimalLead(supabase, picked.id);
  return NextResponse.json({ customer: lead, active_call_id: newCallId, version });
}
