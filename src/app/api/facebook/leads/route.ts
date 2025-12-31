import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "intenzze_leads_verify_token";
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

// Validera Facebook webhook-signatur
function validateSignature(payload: string, signature: string | null): boolean {
  if (!APP_SECRET) {
    return false;
  }

  if (!signature) {
    return false;
  }

  try {
    const expectedSignature = "sha256=" + crypto
      .createHmac("sha256", APP_SECRET)
      .update(payload)
      .digest("hex");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// Supabase admin-klient
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

  if (!mode && !token && !challenge) {
    return NextResponse.json({
      status: "Facebook Lead Ads Webhook Active",
      endpoint: "/api/facebook/leads",
    });
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST - Ta emot leads från Facebook
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    if (!validateSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (!body.entry || !Array.isArray(body.entry)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const processedLeads: string[] = [];

    for (const entry of body.entry) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "leadgen") {
          continue;
        }

        const metadata = {
          leadgen_id: change.value?.leadgen_id,
          form_id: change.value?.form_id,
          ad_id: change.value?.ad_id,
          adgroup_id: change.value?.adgroup_id,
          page_id: change.value?.page_id,
        };

        const customerId = await saveBasicLead(metadata);

        if (!customerId) {
          continue;
        }

        processedLeads.push(metadata.leadgen_id);

        const leadData = await fetchLeadData(metadata.leadgen_id);

        if (leadData) {
          await updateLeadWithContactInfo(customerId, leadData);
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedLeads.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Generera appsecret_proof
function generateAppSecretProof(accessToken: string): string | null {
  if (!APP_SECRET) {
    return null;
  }
  return crypto.createHmac("sha256", APP_SECRET).update(accessToken).digest("hex");
}

// Hämta lead-data från Facebook Graph API
async function fetchLeadData(leadgenId: string) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    return null;
  }

  const appSecretProof = generateAppSecretProof(accessToken);

  if (!appSecretProof) {
    return null;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}&appsecret_proof=${appSecretProof}`
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

// Spara basdata från webhook
async function saveBasicLead(metadata: {
  leadgen_id: string;
  form_id: string;
  ad_id: string;
  adgroup_id: string;
  page_id: string;
}): Promise<string | null> {
  try {
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("facebook_lead_id", metadata.leadgen_id)
      .single();

    if (existing) {
      return null;
    }

    const { data, error } = await supabaseAdmin.from("customers").insert({
      first_name: "Facebook",
      last_name: "Lead",
      status: "lead",
      source: "facebook_ads",
      facebook_lead_id: metadata.leadgen_id,
      is_read: false,
      notes: `Facebook Lead Ad
Lead ID: ${metadata.leadgen_id}
Form ID: ${metadata.form_id}
Ad ID: ${metadata.ad_id}
Mottagen: ${new Date().toLocaleString("sv-SE")}`,
    }).select("id").single();

    if (error) {
      return null;
    }

    return data.id;
  } catch {
    return null;
  }
}

// Uppdatera lead med kontaktinfo från Facebook API
async function updateLeadWithContactInfo(customerId: string, leadData: any) {
  try {
    const fieldData = leadData.field_data || [];
    const fields: Record<string, string> = {};

    // Logga all field_data för debugging
    console.log(`[Facebook Lead] Customer ${customerId} - Mottagna fält:`, JSON.stringify(fieldData, null, 2));

    for (const field of fieldData) {
      const name = field.name?.toLowerCase();
      const value = field.values?.[0] || "";
      fields[name] = value;
    }

    // Logga alla extraherade fält
    console.log(`[Facebook Lead] Customer ${customerId} - Mappade fält:`, JSON.stringify(fields, null, 2));

    const firstName = fields.first_name || fields.förnamn || fields.full_name?.split(" ")[0] || null;
    const lastName = fields.last_name || fields.efternamn || fields.full_name?.split(" ").slice(1).join(" ") || null;
    const email = fields.email || fields['e-post'] || null;

    // Utökad sökning för telefonnummer - Facebook kan använda olika fältnamn
    const phone = fields.phone_number || fields.phone || fields.telefon ||
                  fields.mobile_phone_number || fields.mobile || fields.mobiltelefon ||
                  fields.tel || fields.telephone || fields.telefonnummer ||
                  fields.cell_phone || fields.cellphone || null;

    console.log(`[Facebook Lead] Customer ${customerId} - Extraherat telefon: "${phone || 'SAKNAS'}"`);

    if (!phone) {
      console.warn(`[Facebook Lead] Customer ${customerId} - VARNING: Inget telefonnummer hittades! Tillgängliga fält: ${Object.keys(fields).join(', ')}`);
    }
    const companyName = fields.company_name || fields.company || fields.företag || null;
    const city = fields.city || fields.stad || null;

    const standardFields = [
      'first_name', 'last_name', 'full_name', 'email',
      'phone_number', 'phone', 'telefon', 'mobile_phone_number', 'mobile', 'mobiltelefon', 'tel', 'telephone', 'telefonnummer', 'cell_phone', 'cellphone',
      'company_name', 'company', 'city', 'förnamn', 'efternamn', 'e-post', 'företag', 'stad'
    ];
    const customAnswers: string[] = [];

    for (const field of fieldData) {
      const name = field.name?.toLowerCase();
      const value = field.values?.[0] || "";
      if (standardFields.includes(name) || !value) continue;
      const label = field.name?.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) || name;
      customAnswers.push(`${label}: ${value}`);
    }

    const wishes = customAnswers.length > 0 ? customAnswers.join('\n') : null;

    const updateData: Record<string, any> = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (companyName) updateData.company_name = companyName;
    if (city) updateData.city = city;
    if (wishes) updateData.wishes = wishes;

    const { data: currentCustomer } = await supabaseAdmin
      .from("customers")
      .select("notes")
      .eq("id", customerId)
      .single();

    updateData.notes = (currentCustomer?.notes || "").replace(
      "(väntar på kontaktinfo)",
      `(kontaktinfo hämtad ${new Date().toLocaleString("sv-SE")})`
    );

    const { error: updateError } = await supabaseAdmin
      .from("customers")
      .update(updateData)
      .eq("id", customerId);

    if (updateError) {
      console.error(`[Facebook Lead] Customer ${customerId} - Fel vid uppdatering:`, updateError);
    } else {
      console.log(`[Facebook Lead] Customer ${customerId} - Uppdaterad med:`, JSON.stringify(updateData, null, 2));
    }
  } catch (error) {
    console.error(`[Facebook Lead] Customer ${customerId} - Oväntat fel:`, error);
  }
}
