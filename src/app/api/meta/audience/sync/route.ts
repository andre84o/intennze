import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  isMetaAudienceConfigured,
  createCustomAudience,
  addUsersToAudience,
  hasUsableIdentifier,
  type AudienceUser,
} from "@/lib/meta/audiences";

// Builds (or refreshes) a Meta Custom Audience from a CRM segment. The segment
// is selected server-side from the authenticated admin's customers — the client
// only sends the status allowlist, never any PII.

const VALID_STATUSES = ["lead", "contacted", "negotiating", "customer", "churned"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

function sanitizeStatuses(input: unknown): ValidStatus[] {
  if (!Array.isArray(input)) return [];
  const allow = new Set<string>(VALID_STATUSES);
  const seen = new Set<ValidStatus>();
  for (const s of input) {
    if (typeof s === "string" && allow.has(s)) seen.add(s as ValidStatus);
  }
  return [...seen];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!isMetaAudienceConfigured()) {
      return NextResponse.json(
        { success: false, error: "Meta audience not configured (META_AD_ACCOUNT_ID / access token missing)" },
        { status: 200 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const statuses = sanitizeStatuses(body?.statuses);
    const audienceId = typeof body?.audienceId === "string" && body.audienceId.trim()
      ? body.audienceId.trim()
      : null;
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";

    if (statuses.length === 0) {
      return NextResponse.json({ success: false, error: "Minst en giltig status krävs" }, { status: 400 });
    }
    if (!audienceId && !name) {
      return NextResponse.json({ success: false, error: "Namn krävs för ny publik" }, { status: 400 });
    }

    // Read the segment server-side — never trust the client for PII. RLS scopes
    // this to the authenticated admin's customers.
    const { data: customers, error: dbError } = await supabase
      .from("customers")
      .select("id, email, phone, first_name, last_name, city, postal_code, country, status")
      .in("status", statuses);

    if (dbError) {
      console.error("[Meta Audience] db read failed:", dbError.message);
      return NextResponse.json({ success: false, error: "Kunde inte läsa kunder" }, { status: 500 });
    }

    const users: AudienceUser[] = (customers || []).map((c) => ({
      id: c.id,
      email: c.email,
      phone: c.phone,
      firstName: c.first_name,
      lastName: c.last_name,
      city: c.city,
      postalCode: c.postal_code,
      country: c.country,
    }));

    const matchable = users.filter(hasUsableIdentifier);
    if (matchable.length === 0) {
      return NextResponse.json(
        { success: false, error: "Inga kunder i segmentet har e-post eller telefon" },
        { status: 200 }
      );
    }

    // Create the audience on first sync; reuse it on subsequent re-syncs.
    let targetAudienceId = audienceId;
    let created = false;
    if (!targetAudienceId) {
      const createResult = await createCustomAudience(name);
      if (!createResult.ok || !createResult.audienceId) {
        return NextResponse.json({ success: false, error: "Kunde inte skapa publik i Meta" }, { status: 200 });
      }
      targetAudienceId = createResult.audienceId;
      created = true;
    }

    const uploadResult = await addUsersToAudience(targetAudienceId, matchable);
    if (!uploadResult.ok) {
      return NextResponse.json(
        { success: false, error: "Kunde inte ladda upp kunder till Meta", audienceId: targetAudienceId, created },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      audienceId: targetAudienceId,
      created,
      segmentSize: users.length,
      matched: matchable.length,
      numReceived: uploadResult.numReceived ?? 0,
      numInvalid: uploadResult.numInvalid ?? 0,
    });
  } catch (error) {
    console.error("[Meta Audience] sync error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
