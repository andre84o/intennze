export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { callSessionLimiter, tryLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { isUuid, minimalLead, nextVersion } from "@/lib/callSession";

// POST /api/call/assign — manually push a specific customer to the mobile.
// Bypasses the Next Lead predicate (explicit agent choice). No Meta.
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

  const customerId = body.customer_id;
  if (!isUuid(customerId)) {
    return NextResponse.json({ error: "Ogiltigt customer_id" }, { status: 400 });
  }

  const lead = await minimalLead(supabase, customerId);
  if (!lead) {
    return NextResponse.json({ error: "Kunden hittades inte" }, { status: 404 });
  }

  // Preserve any existing snapshot; only override the active customer.
  const { data: existing } = await supabase
    .from("call_sessions")
    .select("lead_order, lead_index")
    .eq("agent_id", user.id)
    .maybeSingle();

  const newCallId = randomUUID();
  const version = await nextVersion(supabase, user.id);

  const { error: upsertErr } = await supabase
    .from("call_sessions")
    .upsert(
      {
        agent_id: user.id,
        lead_order: (existing?.lead_order as string[] | undefined) ?? [],
        lead_index: (existing?.lead_index as number | undefined) ?? -1,
        active_customer_id: customerId,
        active_call_id: newCallId,
        state: "dialing",
        version,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_id" }
    );

  if (upsertErr) {
    console.error("[call/assign] upsert error:", upsertErr.message);
    return NextResponse.json({ error: "Kunde inte tilldela kund" }, { status: 500 });
  }

  return NextResponse.json({ customer: lead, active_call_id: newCallId, version });
}
