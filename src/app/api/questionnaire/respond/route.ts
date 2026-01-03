import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Telegram notification
async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
  } catch (error) {
    console.error("[Telegram] Fel:", error);
  }
}

// Use service role for this API since it's public
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, ...responses } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // First, get the questionnaire
    const { data: questionnaire, error: fetchError } = await supabase
      .from("questionnaires")
      .select("id, status, customer_id")
      .eq("public_token", token)
      .single();

    if (fetchError || !questionnaire) {
      return NextResponse.json(
        { error: "Questionnaire not found" },
        { status: 404 }
      );
    }

    // Check if already completed
    if (questionnaire.status === "completed") {
      return NextResponse.json(
        { error: "Questionnaire has already been completed" },
        { status: 400 }
      );
    }

    // Save the responses
    const { error: insertError } = await supabase
      .from("questionnaire_responses")
      .insert({
        questionnaire_id: questionnaire.id,
        industry: responses.industry || null,
        has_domain: responses.has_domain,
        domain_name: responses.domain_name || null,
        wants_domain_help: responses.wants_domain_help,
        domain_suggestions: responses.domain_suggestions || null,
        wants_maintenance: responses.wants_maintenance,
        page_count: responses.page_count || null,
        has_content: responses.has_content,
        content_help_needed: responses.content_help_needed || null,
        features: responses.features || [],
        other_features: responses.other_features || null,
        design_preferences: responses.design_preferences || null,
        reference_sites: responses.reference_sites || null,
        budget_range: responses.budget_range || null,
        timeline: responses.timeline || null,
        additional_info: responses.additional_info || null,
      });

    if (insertError) {
      console.error("Error saving responses:", insertError);
      return NextResponse.json(
        { error: "Failed to save responses" },
        { status: 500 }
      );
    }

    // Update questionnaire status
    const { error: updateError } = await supabase
      .from("questionnaires")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", questionnaire.id);

    if (updateError) {
      console.error("Error updating questionnaire status:", updateError);
    }

    // Build wishes summary for customer record
    const wishesSummary = buildWishesSummary(responses);

    // Update customer with summary in wishes field and company/address info
    if (questionnaire.customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("wishes, company_name, org_number, contact_person, position, address, postal_code, city")
        .eq("id", questionnaire.customer_id)
        .single();

      const existingWishes = customer?.wishes || "";
      const newWishes = existingWishes
        ? `${existingWishes}\n\n--- Formulärsvar ${new Date().toLocaleDateString("sv-SE")} ---\n${wishesSummary}`
        : wishesSummary;

      // Build update object - only update fields that are empty in customer and provided in response
      const customerUpdate: Record<string, string> = { wishes: newWishes };

      // Update company info if provided and customer doesn't have it
      if (responses.company_name && !customer?.company_name) {
        customerUpdate.company_name = responses.company_name as string;
      }
      if (responses.org_number && !customer?.org_number) {
        customerUpdate.org_number = responses.org_number as string;
      }
      if (responses.contact_person && !customer?.contact_person) {
        customerUpdate.contact_person = responses.contact_person as string;
      }
      if (responses.position && !customer?.position) {
        customerUpdate.position = responses.position as string;
      }

      // Update address info if provided and customer doesn't have it
      if (responses.address && !customer?.address) {
        customerUpdate.address = responses.address as string;
      }
      if (responses.postal_code && !customer?.postal_code) {
        customerUpdate.postal_code = responses.postal_code as string;
      }
      if (responses.city && !customer?.city) {
        customerUpdate.city = responses.city as string;
      }

      await supabase
        .from("customers")
        .update(customerUpdate)
        .eq("id", questionnaire.customer_id);
    }

    // Create reminder for follow-up
    if (questionnaire.customer_id) {
      await supabase.from("reminders").insert({
        customer_id: questionnaire.customer_id,
        title: "Följ upp formulärsvar",
        description: "Kunden har fyllt i frågeformuläret. Granska svaren och skapa offert.",
        reminder_date: new Date().toISOString().split("T")[0],
        type: "follow_up",
      });
    }

    console.log(`Questionnaire ${questionnaire.id} completed`);

    // Hämta kundinfo för Telegram
    const { data: customerData } = await supabase
      .from("customers")
      .select("first_name, last_name, email, phone")
      .eq("id", questionnaire.customer_id)
      .single();

    const customerName = customerData
      ? `${customerData.first_name || ""} ${customerData.last_name || ""}`.trim() || "Okänd"
      : "Okänd";

    await sendTelegramNotification(
      `📋 <b>Frågeformulär ifyllt!</b>\n\n` +
      `👤 <b>Kund:</b> ${customerName}\n` +
      `📧 <b>E-post:</b> ${customerData?.email || "—"}\n` +
      `📞 <b>Telefon:</b> ${customerData?.phone || "—"}\n\n` +
      `🔗 <a href="https://intenzze.com/admin/forsaljning">Öppna CRM</a>`
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Questionnaire response error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function buildWishesSummary(responses: Record<string, unknown>): string {
  const lines: string[] = [];

  if (responses.industry) {
    lines.push(`Bransch: ${responses.industry}`);
  }

  if (responses.has_domain === true) {
    lines.push(`Domän: ${responses.domain_name || "Ja, har domän"}`);
  } else if (responses.has_domain === false) {
    if (responses.wants_domain_help) {
      lines.push("Domän: Behöver hjälp");
      if (responses.domain_suggestions) {
        lines.push(`Domänförslag: ${responses.domain_suggestions}`);
      }
    } else {
      lines.push("Domän: Fixar själv");
    }
  }

  if (responses.wants_maintenance === true) {
    lines.push("Underhåll: Ja");
  } else if (responses.wants_maintenance === false) {
    lines.push("Underhåll: Sköter själv");
  }

  if (responses.page_count) {
    const pageLabels: Record<string, string> = {
      "1-3": "1-3 sidor",
      "4-7": "4-7 sidor",
      "8-15": "8-15 sidor",
      "15+": "Fler än 15 sidor",
    };
    lines.push(`Antal sidor: ${pageLabels[responses.page_count as string] || responses.page_count}`);
  }

  if (responses.has_content === true) {
    lines.push("Innehåll: Har bilder & texter");
  } else if (responses.has_content === false) {
    const helpType = responses.content_help_needed === "all" ? "Behöver all hjälp" : "Behöver lite hjälp";
    lines.push(`Innehåll: ${helpType}`);
  }

  const features = responses.features as string[] | undefined;
  if (features && features.length > 0) {
    const featureLabels: Record<string, string> = {
      contact_form: "Kontaktformulär",
      booking: "Bokningssystem",
      webshop: "Webshop",
      blog: "Blogg",
      gallery: "Bildgalleri",
      social_feed: "Sociala medier",
      newsletter: "Nyhetsbrev",
      chat: "Chatt",
      map: "Karta",
      video: "Videor",
      testimonials: "Kundrecensioner",
      faq: "FAQ",
    };
    const featureNames = features.map((f) => featureLabels[f] || f).join(", ");
    lines.push(`Funktioner: ${featureNames}`);
  }

  if (responses.other_features) {
    lines.push(`Övriga funktioner: ${responses.other_features}`);
  }

  if (responses.design_preferences) {
    lines.push(`Design: ${responses.design_preferences}`);
  }

  if (responses.reference_sites) {
    lines.push(`Referenssidor: ${responses.reference_sites}`);
  }

  if (responses.budget_range) {
    const budgetLabels: Record<string, string> = {
      "5000-10000": "5 000 - 10 000 kr",
      "10000-20000": "10 000 - 20 000 kr",
      "20000-40000": "20 000 - 40 000 kr",
      "40000-60000": "40 000 - 60 000 kr",
      "60000+": "Över 60 000 kr",
      unsure: "Vet inte än",
    };
    lines.push(`Budget: ${budgetLabels[responses.budget_range as string] || responses.budget_range}`);
  }

  if (responses.timeline) {
    const timelineLabels: Record<string, string> = {
      asap: "Så snart som möjligt",
      "1-2weeks": "1-2 veckor",
      "1month": "Inom 1 månad",
      "2-3months": "2-3 månader",
      flexible: "Flexibel",
    };
    lines.push(`Tidslinje: ${timelineLabels[responses.timeline as string] || responses.timeline}`);
  }

  if (responses.additional_info) {
    lines.push(`Övrigt: ${responses.additional_info}`);
  }

  return lines.join("\n");
}
