import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Facebook Lead Ads Webhook
// Dokumentation: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "intenzze_leads_verify_token";

// Supabase admin-klient för att kringgå RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Facebook webhook verifiering
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Verifiera att det är en subscription-förfrågan
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Facebook webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  console.log("Facebook webhook verification failed");
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST - Ta emot leads från Facebook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Received Facebook lead webhook:", JSON.stringify(body, null, 2));

    // Facebook skickar data i entry-array
    if (!body.entry || !Array.isArray(body.entry)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const processedLeads: string[] = [];

    for (const entry of body.entry) {
      // Varje entry kan ha flera changes
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "leadgen") continue;

        const leadgenId = change.value?.leadgen_id;
        const formId = change.value?.form_id;
        const adId = change.value?.ad_id;
        const adgroupId = change.value?.adgroup_id;
        const pageId = change.value?.page_id;

        // Hämta lead-data från Facebook Graph API
        const leadData = await fetchLeadData(leadgenId);

        if (leadData) {
          // Spara lead i databasen
          const saved = await saveLeadToDatabase(leadData, {
            leadgen_id: leadgenId,
            form_id: formId,
            ad_id: adId,
            adgroup_id: adgroupId,
            page_id: pageId,
          });

          if (saved) {
            processedLeads.push(leadgenId);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedLeads.length,
      leads: processedLeads,
    });
  } catch (error) {
    console.error("Error processing Facebook lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Hämta lead-data från Facebook Graph API
async function fetchLeadData(leadgenId: string) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("FACEBOOK_ACCESS_TOKEN is not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error("Failed to fetch lead data:", await response.text());
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching lead data:", error);
    return null;
  }
}

// Spara lead till databasen
async function saveLeadToDatabase(
  leadData: any,
  metadata: {
    leadgen_id: string;
    form_id: string;
    ad_id: string;
    adgroup_id: string;
    page_id: string;
  }
) {
  try {
    // Extrahera fält från Facebook lead data
    const fieldData = leadData.field_data || [];
    const fields: Record<string, string> = {};

    for (const field of fieldData) {
      const name = field.name?.toLowerCase();
      const value = field.values?.[0] || "";
      fields[name] = value;
    }

    // Mappa Facebook-fält till våra fält
    // Vanliga Facebook lead-fält: email, phone_number, full_name, first_name, last_name, company_name, etc.
    const firstName = fields.first_name || fields.full_name?.split(" ")[0] || "Facebook";
    const lastName = fields.last_name || fields.full_name?.split(" ").slice(1).join(" ") || "Lead";
    const email = fields.email || null;
    const phone = fields.phone_number || fields.phone || null;
    const companyName = fields.company_name || fields.company || null;
    const city = fields.city || null;
    const message = fields.message || fields.question || fields.comments || null;

    // Kolla om lead redan finns (via email eller facebook_lead_id)
    if (email) {
      const { data: existing } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("email", email)
        .single();

      if (existing) {
        console.log(`Lead with email ${email} already exists, skipping`);
        return false;
      }
    }

    // Skapa lead i databasen
    const { data, error } = await supabaseAdmin.from("customers").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      company_name: companyName,
      city,
      wishes: message,
      status: "lead",
      source: "facebook_ads",
      notes: `Facebook Lead Ad
Lead ID: ${metadata.leadgen_id}
Form ID: ${metadata.form_id}
Ad ID: ${metadata.ad_id}
Skapad: ${new Date().toLocaleString("sv-SE")}`,
    }).select().single();

    if (error) {
      console.error("Error saving lead to database:", error);
      return false;
    }

    console.log(`Successfully saved Facebook lead: ${data.id}`);

    // Skapa automatisk påminnelse för uppföljning
    await supabaseAdmin.from("reminders").insert({
      customer_id: data.id,
      title: "Följ upp Facebook-lead",
      description: `Ny lead från Facebook annons. Kontakta ${firstName} ${lastName} snarast.`,
      reminder_date: new Date().toISOString().split("T")[0],
      type: "follow_up",
    });

    return true;
  } catch (error) {
    console.error("Error in saveLeadToDatabase:", error);
    return false;
  }
}
