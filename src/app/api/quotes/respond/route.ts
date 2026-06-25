import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { quoteRespondLimiter, getClientIp, tryLimit, rateLimitHeaders } from "@/lib/ratelimit";

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
    const ip = getClientIp(request);
    const limit = await tryLimit(quoteRespondLimiter, ip);
    if (limit && !limit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    const body = await request.json();
    const { token, accept, note } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // First, verify the quote exists and hasn't been responded to
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("id, status, customer_id, valid_until")
      .eq("public_token", token)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    // Check if already responded
    if (quote.status === "accepted" || quote.status === "declined") {
      return NextResponse.json(
        { error: "Quote has already been responded to" },
        { status: 400 }
      );
    }

    // Enforce expiry server-side — never trust the client-side check.
    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      return NextResponse.json(
        { error: "Quote has expired" },
        { status: 400 }
      );
    }

    // Update the quote
    const newStatus = accept ? "accepted" : "declined";
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: newStatus,
        customer_response_at: new Date().toISOString(),
        customer_response_note: note || null,
      })
      .eq("public_token", token);

    if (updateError) {
      console.error("Error updating quote:", updateError);
      return NextResponse.json(
        { error: "Failed to update quote" },
        { status: 500 }
      );
    }

    // If accepted, update customer status to "customer"
    if (accept && quote.customer_id) {
      await supabase
        .from("customers")
        .update({
          status: "customer",
          has_purchased: true,
        })
        .eq("id", quote.customer_id);
    }

    console.log(`Quote ${quote.id} ${newStatus} by customer`);

    // Hämta kundinfo för Telegram
    const { data: customerData } = await supabase
      .from("customers")
      .select("first_name, last_name")
      .eq("id", quote.customer_id)
      .single();

    const customerName = customerData
      ? `${customerData.first_name || ""} ${customerData.last_name || ""}`.trim() || "Okänd"
      : "Okänd";

    const emoji = accept ? "✅" : "❌";
    const status = accept ? "ACCEPTERAD" : "AVBÖJD";

    await sendTelegramNotification(
      `${emoji} <b>Offert ${status}!</b>\n\n` +
      `👤 <b>Kund:</b> ${customerName}\n` +
      (note ? `💬 <b>Kommentar:</b> ${note}\n\n` : "\n") +
      `🔗 <a href="https://intenzze.com/admin/crm">Öppna CRM</a>`
    );

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    console.error("Quote response error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
