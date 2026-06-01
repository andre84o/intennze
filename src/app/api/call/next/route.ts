export const runtime = "nodejs";

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { callSessionLimiter, tryLimit, rateLimitHeaders } from "@/lib/ratelimit";
import { isUuid, minimalLead, pickFirstCallable } from "@/lib/callSession";

// POST /api/call/next — advance the snapshot to the next callable lead.
// Compare-and-swap on version; 409 on mismatch. No Meta.
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

  const sessionId = body.session_id;
  const version = body.version;
  if (!isUuid(sessionId) || typeof version !== "number" || !Number.isInteger(version)) {
    return NextResponse.json({ error: "Ogiltiga fält" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("call_sessions")
    .select("agent_id, lead_order, lead_index")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.agent_id !== user.id) {
    return NextResponse.json({ error: "Ingen aktiv session" }, { status: 409 });
  }

  const leadOrder = (session.lead_order as string[]) ?? [];
  const fromIndex = ((session.lead_index as number) ?? -1) + 1;
  const picked = await pickFirstCallable(supabase, leadOrder, fromIndex);
  const newCallId = picked ? randomUUID() : null;

  // CAS on version — only this exact version may advance.
  const { data: updated } = await supabase
    .from("call_sessions")
    .update({
      active_customer_id: picked ? picked.id : null,
      active_call_id: newCallId,
      lead_index: picked ? picked.index : leadOrder.length,
      state: picked ? "dialing" : "idle",
      version: version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("agent_id", user.id)
    .eq("version", version)
    .select("id");

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Sessionen har uppdaterats — ladda om" }, { status: 409 });
  }

  if (!picked) {
    return NextResponse.json({ none: true, version: version + 1 });
  }

  const lead = await minimalLead(supabase, picked.id);
  return NextResponse.json({ customer: lead, active_call_id: newCallId, version: version + 1 });
}
