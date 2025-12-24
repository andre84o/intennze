import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Facebook Lead Ads Webhook
// Dokumentation: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "intenzze_leads_verify_token";
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;

// Validera Facebook webhook-signatur
function validateSignature(payload: string, signature: string | null): boolean {
  if (!APP_SECRET) {
    console.warn("⚠️ FACEBOOK_APP_SECRET inte konfigurerad - hoppar över signaturvalidering");
    return true; // Tillåt om secret inte är konfigurerad (för utveckling)
  }

  if (!signature) {
    console.error("❌ Ingen X-Hub-Signature-256 header");
    return false;
  }

  const expectedSignature = "sha256=" + crypto
    .createHmac("sha256", APP_SECRET)
    .update(payload)
    .digest("hex");

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    console.error("❌ Ogiltig signatur från Facebook");
    console.error("   Mottagen:", signature);
    console.error("   Förväntad:", expectedSignature);
  }

  return isValid;
}

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

  // Om inga parametrar - visa status
  if (!mode && !token && !challenge) {
    return NextResponse.json({
      status: "Facebook Lead Ads Webhook Active",
      endpoint: "/api/facebook/leads",
      verify_token_configured: !!VERIFY_TOKEN,
      access_token_configured: !!process.env.FACEBOOK_ACCESS_TOKEN,
      app_secret_configured: !!APP_SECRET,
      service_role_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }

  // Verifiera att det är en subscription-förfrågan
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Facebook webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  console.log("Facebook webhook verification failed", { mode, token, expected: VERIFY_TOKEN });
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST - Ta emot leads från Facebook
export async function POST(request: NextRequest) {
  console.log("=== FACEBOOK LEAD WEBHOOK START ===");
  console.log("Tidpunkt:", new Date().toLocaleString("sv-SE"));

  try {
    // Läs raw body för signaturvalidering
    const rawBody = await request.text();
    const signature = request.headers.get("x-hub-signature-256");

    // Validera signatur från Meta
    if (!validateSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    console.log("📥 Mottagen data från Facebook:");
    console.log(JSON.stringify(body, null, 2));

    // Facebook skickar data i entry-array
    if (!body.entry || !Array.isArray(body.entry)) {
      console.log("❌ Ogiltig payload - saknar entry array");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log(`📋 Antal entries: ${body.entry.length}`);

    const processedLeads: string[] = [];

    for (const entry of body.entry) {
      // Varje entry kan ha flera changes
      const changes = entry.changes || [];
      console.log(`📋 Antal changes i entry: ${changes.length}`);

      for (const change of changes) {
        console.log(`🔍 Change field: ${change.field}`);

        if (change.field !== "leadgen") {
          console.log("⏭️ Hoppar över - inte leadgen");
          continue;
        }

        const leadgenId = change.value?.leadgen_id;
        const formId = change.value?.form_id;
        const adId = change.value?.ad_id;
        const adgroupId = change.value?.adgroup_id;
        const pageId = change.value?.page_id;

        console.log("📝 Lead metadata:", { leadgenId, formId, adId, adgroupId, pageId });

        // Hämta lead-data från Facebook Graph API
        console.log("🔄 Hämtar lead-data från Facebook Graph API...");
        const leadData = await fetchLeadData(leadgenId);

        if (leadData) {
          console.log("✅ Lead-data hämtad från Facebook");
          console.log("📄 Lead field_data:", JSON.stringify(leadData.field_data, null, 2));

          // Spara lead i databasen
          console.log("💾 Sparar lead i databasen...");
          const saved = await saveLeadToDatabase(leadData, {
            leadgen_id: leadgenId,
            form_id: formId,
            ad_id: adId,
            adgroup_id: adgroupId,
            page_id: pageId,
          });

          if (saved) {
            console.log("✅ Lead sparad!");
            processedLeads.push(leadgenId);
          } else {
            console.log("⚠️ Lead kunde inte sparas (kanske duplikat)");
          }
        } else {
          console.log("❌ Kunde inte hämta lead-data från Facebook");
        }
      }
    }

    console.log(`=== FACEBOOK LEAD WEBHOOK KLAR - ${processedLeads.length} leads processade ===`);

    return NextResponse.json({
      success: true,
      processed: processedLeads.length,
      leads: processedLeads,
    });
  } catch (error) {
    console.error("❌ FEL vid processning av Facebook lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Generera appsecret_proof för säkra server-till-server anrop
function generateAppSecretProof(accessToken: string): string | null {
  if (!APP_SECRET) {
    console.warn("⚠️ FACEBOOK_APP_SECRET inte konfigurerad - kan inte generera appsecret_proof");
    return null;
  }
  return crypto.createHmac("sha256", APP_SECRET).update(accessToken).digest("hex");
}

// Hämta lead-data från Facebook Graph API
async function fetchLeadData(leadgenId: string) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("❌ FACEBOOK_ACCESS_TOKEN är inte konfigurerad!");
    console.error("Lägg till FACEBOOK_ACCESS_TOKEN i Vercel miljövariabler");
    return null;
  }

  console.log(`🔗 Anropar Facebook Graph API för lead ${leadgenId}`);

  // Generera appsecret_proof för säkra server-anrop
  const appSecretProof = generateAppSecretProof(accessToken);

  if (!appSecretProof) {
    console.error("❌ FACEBOOK_APP_SECRET är inte konfigurerad!");
    console.error("Lägg till FACEBOOK_APP_SECRET i Vercel miljövariabler");
    return null;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}&appsecret_proof=${appSecretProof}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Facebook API-fel:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("✅ Facebook API svarade OK");
    return data;
  } catch (error) {
    console.error("❌ Nätverksfel vid anrop till Facebook:", error);
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

    console.log("📋 Extraherar fält från lead...");

    for (const field of fieldData) {
      const name = field.name?.toLowerCase();
      const value = field.values?.[0] || "";
      fields[name] = value;
      console.log(`   - ${field.name}: ${value}`);
    }

    // Mappa Facebook-fält till våra fält
    // Vanliga Facebook lead-fält: email, phone_number, full_name, first_name, last_name, company_name, etc.
    // Stöd för både engelska och svenska fältnamn
    const firstName = fields.first_name || fields.förnamn || fields.full_name?.split(" ")[0] || "Facebook";
    const lastName = fields.last_name || fields.efternamn || fields.full_name?.split(" ").slice(1).join(" ") || "Lead";
    const email = fields.email || fields['e-post'] || null;
    const phone = fields.phone_number || fields.phone || fields.telefon || null;
    const companyName = fields.company_name || fields.company || fields.företag || null;
    const city = fields.city || fields.stad || null;

    console.log("👤 Mappade kundfält:");
    console.log(`   Namn: ${firstName} ${lastName}`);
    console.log(`   E-post: ${email || '(saknas)'}`);
    console.log(`   Telefon: ${phone || '(saknas)'}`);
    console.log(`   Företag: ${companyName || '(saknas)'}`);
    console.log(`   Stad: ${city || '(saknas)'}`);

    // Samla alla formulärsvar (inkl. egna frågor) för Önskemål / Behov
    const standardFields = ['first_name', 'last_name', 'full_name', 'email', 'phone_number', 'phone', 'company_name', 'company', 'city', 'förnamn', 'efternamn', 'e-post', 'telefon', 'företag', 'stad'];
    const customAnswers: string[] = [];

    for (const field of fieldData) {
      const name = field.name?.toLowerCase();
      const value = field.values?.[0] || "";

      // Hoppa över standardfält som redan mappas
      if (standardFields.includes(name) || !value) continue;

      // Formatera fältnamn snyggt (t.ex. "budget_range" → "Budget range")
      const label = field.name?.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) || name;
      customAnswers.push(`${label}: ${value}`);
    }

    const wishes = customAnswers.length > 0 ? customAnswers.join('\n') : null;

    if (wishes) {
      console.log("📝 Önskemål/Behov:");
      console.log(wishes);
    }

    // Kolla om lead redan finns (via facebook_lead_id först, sedan email)
    const { data: existingByLeadId } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("facebook_lead_id", metadata.leadgen_id)
      .single();

    if (existingByLeadId) {
      console.log(`⚠️ Lead med facebook_lead_id ${metadata.leadgen_id} finns redan - hoppar över`);
      return false;
    }

    if (email) {
      const { data: existingByEmail } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("email", email)
        .single();

      if (existingByEmail) {
        console.log(`⚠️ Lead med e-post ${email} finns redan - hoppar över`);
        return false;
      }
    }

    // Skapa lead i databasen
    console.log("💾 Skapar kund i databasen...");
    const { data, error } = await supabaseAdmin.from("customers").insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      company_name: companyName,
      city,
      wishes,
      status: "lead",
      source: "facebook_ads",
      facebook_lead_id: metadata.leadgen_id,
      notes: `Facebook Lead Ad
Form ID: ${metadata.form_id}
Ad ID: ${metadata.ad_id}
Skapad: ${new Date().toLocaleString("sv-SE")}`,
    }).select().single();

    if (error) {
      console.error("❌ Databasfel vid sparande:", error.message);
      console.error("   Kod:", error.code);
      console.error("   Detaljer:", error.details);
      return false;
    }

    console.log(`✅ Kund skapad! ID: ${data.id}`);

    // Skapa automatisk påminnelse för uppföljning
    console.log("⏰ Skapar påminnelse för uppföljning...");
    const { error: reminderError } = await supabaseAdmin.from("reminders").insert({
      customer_id: data.id,
      title: "Följ upp Facebook-lead",
      description: `Ny lead från Facebook annons. Kontakta ${firstName} ${lastName} snarast.`,
      reminder_date: new Date().toISOString().split("T")[0],
      type: "follow_up",
    });

    if (reminderError) {
      console.error("⚠️ Kunde inte skapa påminnelse:", reminderError.message);
    } else {
      console.log("✅ Påminnelse skapad");
    }

    return true;
  } catch (error) {
    console.error("❌ Oväntat fel i saveLeadToDatabase:", error);
    return false;
  }
}
