import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";

const META_PIXEL_ID = process.env.META_PIXEL_ID || "";
const META_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || "";
const META_API_VERSION = "v24.0";

// SHA256 hash funktion
function sha256Hash(value: string): string {
  return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

// Normalisera telefonnummer (ta bort allt utom siffror, lägg till landskod)
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  // Om det börjar med 0, byt till 46 (Sverige)
  if (cleaned.startsWith("0")) {
    cleaned = "46" + cleaned.substring(1);
  }
  // Om det inte har landskod, lägg till 46
  if (cleaned.length <= 10) {
    cleaned = "46" + cleaned;
  }
  return cleaned;
}

// Mappa CRM-status till Facebook försäljningstratt-händelser
// Dessa matchar Facebooks fördefinierade händelser för Lead Ads
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
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, previousStatus } = body;

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json({ success: false, error: "customerId required" }, { status: 400 });
    }

    if (!META_ACCESS_TOKEN || !META_PIXEL_ID) {
      console.warn("META_ACCESS_TOKEN or META_PIXEL_ID not configured");
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

    // Bygg user_data med hashade värden
    const userData: Record<string, unknown> = {};

    if (customer.email) {
      userData.em = [sha256Hash(customer.email)];
    }

    if (customer.phone) {
      userData.ph = [sha256Hash(normalizePhone(customer.phone))];
    }

    if (customer.meta_lead_id) {
      userData.lead_id = customer.meta_lead_id;
    }

    if (customer.fbclid) {
      userData.fbc = customer.fbclid;
    }

    if (customer.first_name) {
      userData.fn = [sha256Hash(customer.first_name)];
    }

    if (customer.last_name) {
      userData.ln = [sha256Hash(customer.last_name)];
    }

    if (customer.city) {
      userData.ct = [sha256Hash(customer.city)];
    }

    if (customer.postal_code) {
      userData.zp = [sha256Hash(customer.postal_code)];
    }

    // Land (default Sverige)
    const country = customer.country || "Sverige";
    const countryCode = country.toLowerCase() === "sverige" ? "se" : country.toLowerCase().slice(0, 2);
    userData.country = [sha256Hash(countryCode)];

    // Bygg händelse-payload
    const eventName = statusToEventName(customer.status);
    const leadScore = getLeadScore(customer.status);

    const eventData = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "system_generated",
          user_data: userData,
          custom_data: {
            event_source: "crm",
            lead_event_source: "Intenzze CRM",
            currency: "SEK",
            value: leadScore * 1000, // Värde för Facebook optimering
            lead_score: leadScore,
            previous_status: previousStatus || null,
            new_status: customer.status,
          },
        },
      ],
    };

    // Logga vad som skickas — utan PII.
    console.log("\n========== META CONVERSION API ==========");
    console.log("📊 FÖRSÄLJNINGSTRATT-HÄNDELSE");
    console.log("Status:", previousStatus, "→", customer.status);
    console.log("Facebook Event:", eventName);
    console.log("Lead Score:", leadScore, "/ 4");
    console.log("Värde:", leadScore * 1000, "SEK");
    console.log("Email:", customer.email ? "✓" : "✗");
    console.log("Telefon:", customer.phone ? "✓" : "✗");
    console.log("Pixel ID:", META_PIXEL_ID ? "Ja ✓" : "Nej ✗");
    console.log("Token:", META_ACCESS_TOKEN ? "Ja ✓" : "Nej ✗");
    console.log("==========================================\n");

    // Skicka till Meta
    const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;

    const response = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ META FEL:", result.error?.message || "request failed");
      return NextResponse.json({ success: false, error: "Meta request failed" }, { status: 200 });
    }

    console.log("✅ META LYCKADES! Events mottagna:", result.events_received || 1);

    return NextResponse.json({ success: true, eventsReceived: result.events_received || 1 });
  } catch (error) {
    console.error("Meta conversion error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
