import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const META_PIXEL_ID = process.env.META_PIXEL_ID || "1537867027358765";
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
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

// Mappa status till Meta event_name
function statusToEventName(status: string): string {
  const statusMap: Record<string, string> = {
    lead: "Lead",
    contacted: "Contact",
    negotiating: "Qualified",
    customer: "Converted",
    churned: "Disqualified",
  };
  return statusMap[status] || "Lead";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, previousStatus } = body;

    if (!META_ACCESS_TOKEN) {
      console.warn("META_ACCESS_TOKEN not configured");
      return NextResponse.json({ success: false, error: "Meta not configured" }, { status: 200 });
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

    // Alltid Sverige
    userData.country = [sha256Hash("se")];

    // Bygg händelse-payload
    const eventData = {
      data: [
        {
          event_name: statusToEventName(customer.status),
          event_time: Math.floor(Date.now() / 1000),
          action_source: "system_generated",
          user_data: userData,
          custom_data: {
            event_source: "crm",
            lead_event_source: "Intenzze CRM",
            currency: "SEK",
            previous_status: previousStatus || null,
            new_status: customer.status,
          },
        },
      ],
    };

    // Logga vad som skickas
    console.log("\n========== META CONVERSION API ==========");
    console.log("Kund:", customer.first_name, customer.last_name);
    console.log("Email:", customer.email || "(saknas)");
    console.log("Telefon:", customer.phone || "(saknas)");
    console.log("Status:", previousStatus, "→", customer.status);
    console.log("Event:", statusToEventName(customer.status));
    console.log("Pixel ID:", META_PIXEL_ID);
    console.log("Token konfigurerad:", META_ACCESS_TOKEN ? "Ja ✓" : "Nej ✗");
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
      console.error("❌ META FEL:", result.error?.message || result);
      return NextResponse.json({ success: false, error: result }, { status: 200 });
    }

    console.log("✅ META LYCKADES! Events mottagna:", result.events_received || 1);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Meta conversion error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
