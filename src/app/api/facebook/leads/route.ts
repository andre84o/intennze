import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { webhookGetLimiter, getClientIp, tryLimit, rateLimitHeaders } from "@/lib/ratelimit";

// Telegram notification
async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log("[Telegram] Bot token eller chat ID saknas");
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!response.ok) {
      console.error("[Telegram] Kunde inte skicka meddelande:", await response.text());
    }
  } catch (error) {
    console.error("[Telegram] Fel vid skickning:", error);
  }
}

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN;
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
  const ip = getClientIp(request);
  const limit = await tryLimit(webhookGetLimiter, ip);
  if (limit && !limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  if (!VERIFY_TOKEN) {
    console.error("[Facebook] FACEBOOK_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

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

        const leadInboxId = await saveBasicLead(metadata);

        if (!leadInboxId) {
          continue;
        }

        processedLeads.push(metadata.leadgen_id);

        const leadData = await fetchLeadData(metadata.leadgen_id);

        if (leadData) {
          await updateLeadWithContactInfo(metadata.leadgen_id, leadData);

          // Skicka Telegram-notifiering
          const fields = leadData.field_data || [];
          const fieldMap: Record<string, string> = {};
          for (const f of fields) {
            fieldMap[f.name?.toLowerCase()] = f.values?.[0] || "";
          }

          const name = fieldMap.first_name || fieldMap.förnamn || fieldMap.full_name || "Okänt namn";
          const phone = fieldMap.phone_number || fieldMap.phone || fieldMap.telefon || "Ingen telefon";
          const email = fieldMap.email || fieldMap['e-post'] || "Ingen e-post";

          await sendTelegramNotification(
            `🔔 <b>Ny lead från Facebook!</b>\n\n` +
            `👤 <b>Namn:</b> ${name}\n` +
            `📞 <b>Telefon:</b> ${phone}\n` +
            `📧 <b>E-post:</b> ${email}\n\n` +
            `🔗 <a href="https://www.intenzze.com/admin/crm">Öppna CRM</a>`
          );
        } else {
          // Skicka notifiering även om vi inte kunde hämta full data
          await sendTelegramNotification(
            `🔔 <b>Ny lead från Facebook!</b>\n\n` +
            `Lead ID: ${metadata.leadgen_id}\n\n` +
            `⚠️ Kunde inte hämta kontaktinfo.\n` +
            `🔗 <a href="https://www.intenzze.com/admin/crm">Öppna CRM</a>`
          );
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

// Spara basdata från webhook into the admin-only `lead_inbox` table. A partial
// unique index on (source, external_id) makes a repeated webhook for the same
// leadgen_id idempotent — the upsert ignores duplicates so no second row is
// created. Contact fields arrive later via updateLeadWithContactInfo.
async function saveBasicLead(metadata: {
  leadgen_id: string;
  form_id: string;
  ad_id: string;
  adgroup_id: string;
  page_id: string;
}): Promise<string | null> {
  try {
    // `raw` holds ONLY the lead metadata — never access tokens, app secrets,
    // or signatures.
    const { data, error } = await supabaseAdmin
      .from("lead_inbox")
      .upsert(
        {
          source: "facebook",
          external_id: metadata.leadgen_id,
          name: "Facebook Lead",
          raw: {
            leadgen_id: metadata.leadgen_id,
            form_id: metadata.form_id,
            ad_id: metadata.ad_id,
            adgroup_id: metadata.adgroup_id,
            page_id: metadata.page_id,
          },
        },
        { onConflict: "source,external_id", ignoreDuplicates: true }
      )
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data.id;
  } catch {
    return null;
  }
}

// Uppdatera lead_inbox-raden med kontaktinfo från Facebook API. Matchar på
// (source='facebook', external_id=leadgen_id) och rör bara rader som fortfarande
// är i status 'new' — en redan tilldelad lead klobbras aldrig.
async function updateLeadWithContactInfo(
  leadgenId: string,
  leadData: any
) {
  try {
    const fieldData = leadData.field_data || [];
    const fields: Record<string, string> = {};

    // Log only field names (not values) — values contain PII (email, phone, name).
    console.log(
      `[Facebook Lead] Lead ${leadgenId} - Mottagna fältnamn:`,
      fieldData.map((f: { name?: string }) => f.name).join(", ")
    );

    for (const field of fieldData) {
      const name = field.name?.toLowerCase();
      const value = field.values?.[0] || "";
      fields[name] = value;
    }

    const firstName = fields.first_name || fields.förnamn || fields.full_name?.split(" ")[0] || null;
    const lastName = fields.last_name || fields.efternamn || fields.full_name?.split(" ").slice(1).join(" ") || null;
    const email = fields.email || fields['e-post'] || null;

    // Utökad sökning för telefonnummer - Facebook kan använda olika fältnamn
    const phone = fields.phone_number || fields.phone || fields.telefon ||
                  fields.mobile_phone_number || fields.mobile || fields.mobiltelefon ||
                  fields.tel || fields.telephone || fields.telefonnummer ||
                  fields.cell_phone || fields.cellphone || null;

    console.log(`[Facebook Lead] Lead ${leadgenId} - Telefon: ${phone ? "extraherat" : "SAKNAS"}`);

    if (!phone) {
      console.warn(`[Facebook Lead] Lead ${leadgenId} - VARNING: Inget telefonnummer hittades! Tillgängliga fältnamn: ${Object.keys(fields).join(', ')}`);
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

    const message = customAnswers.length > 0 ? customAnswers.join('\n') : null;

    // `raw` holds ONLY the lead field answers — never access tokens, app
    // secrets, or signatures.
    const rawFieldData = fieldData.map((f: { name?: string; values?: string[] }) => ({
      name: f.name,
      values: f.values,
    }));

    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;

    const updateData: Record<string, any> = {
      raw: { leadgen_id: leadgenId, field_data: rawFieldData },
    };
    if (fullName) updateData.name = fullName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (companyName) updateData.company = companyName;
    if (message) updateData.message = message;

    const { error: updateError } = await supabaseAdmin
      .from("lead_inbox")
      .update(updateData)
      .eq("source", "facebook")
      .eq("external_id", leadgenId)
      .eq("status", "new");

    if (updateError) {
      console.error(`[Facebook Lead] Lead ${leadgenId} - Fel vid uppdatering:`, updateError);
    } else {
      console.log(
        `[Facebook Lead] Lead ${leadgenId} - Uppdaterad fält:`,
        Object.keys(updateData).join(", ")
      );
    }
  } catch (error) {
    console.error(`[Facebook Lead] Lead ${leadgenId} - Oväntat fel:`, error);
  }
}
