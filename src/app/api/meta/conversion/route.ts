import { NextRequest, NextResponse } from "next/server";
import { requireActiveProfileApi } from "@/lib/auth/apiAuth";
import { sendMetaEvent, isMetaConfigured, buildFbcFromFbclid } from "@/lib/meta/capi";

// Mappa CRM-status till Facebook försäljningstratt-händelser
function statusToEventName(status: string): string {
  const statusMap: Record<string, string> = {
    lead: "Lead",
    contacted: "Contact",
    customer: "Purchase",
    churned: "Other",
  };
  return statusMap[status] || "Lead";
}

// Få värde baserat på steg (används för Facebook optimering)
function getLeadScore(status: string): number {
  const scoreMap: Record<string, number> = {
    lead: 1,
    contacted: 2,
    customer: 4,
    churned: 0,
  };
  return scoreMap[status] || 0;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireActiveProfileApi();
    if (!auth.ok) return auth.response;
    const { supabase } = auth;

    const body = await request.json();
    const { customerId, previousStatus } = body;

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json({ success: false, error: "customerId required" }, { status: 400 });
    }

    if (!isMetaConfigured()) {
      console.warn("Meta CAPI not configured (pixel id / access token missing)");
      return NextResponse.json({ success: false, error: "Meta not configured" }, { status: 200 });
    }

    // Fetch customer from DB — never trust client-supplied PII for an outbound
    // tracking call. The authenticated admin's RLS lets them read customers.
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("status, email, phone, first_name, last_name, city, postal_code, country, meta_lead_id, fbclid")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
    }

    const eventName = statusToEventName(customer.status);
    const leadScore = getLeadScore(customer.status);

    // A stored fbclid is a raw click id — convert it to the `_fbc` wire format.
    const fbc = customer.fbclid ? buildFbcFromFbclid(customer.fbclid) : null;

    // Deterministic dedup id so a repeated status change doesn't double-count.
    const eventId = `crm_${customerId}_${customer.status}`;

    console.log("\n========== META CONVERSION API ==========");
    console.log("📊 FÖRSÄLJNINGSTRATT-HÄNDELSE");
    console.log("Status:", previousStatus, "→", customer.status);
    console.log("Facebook Event:", eventName);
    console.log("Lead Score:", leadScore, "/ 4");
    console.log("Email:", customer.email ? "✓" : "✗");
    console.log("Telefon:", customer.phone ? "✓" : "✗");
    console.log("==========================================\n");

    const result = await sendMetaEvent({
      eventName,
      actionSource: "system_generated",
      eventId,
      user: {
        email: customer.email,
        phone: customer.phone,
        firstName: customer.first_name,
        lastName: customer.last_name,
        city: customer.city,
        postalCode: customer.postal_code,
        country: customer.country || "se",
        externalId: customerId,
        leadId: customer.meta_lead_id,
        fbc,
      },
      customData: {
        event_source: "crm",
        lead_event_source: "Intenzze CRM",
        currency: "SEK",
        value: leadScore * 1000,
        lead_score: leadScore,
        previous_status: previousStatus || null,
        new_status: customer.status,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: "Meta request failed" }, { status: 200 });
    }

    console.log("✅ META LYCKADES! Events mottagna:", result.eventsReceived || 1);
    return NextResponse.json({ success: true, eventsReceived: result.eventsReceived || 1 });
  } catch (error) {
    console.error("Meta conversion error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
