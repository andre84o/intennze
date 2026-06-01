export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import nodemailer from "nodemailer";
import { crmEmailSendLimiter, tryLimit, rateLimitHeaders } from "@/lib/ratelimit";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.eu",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASSWORD,
  },
});

function hasCRLF(s: string): boolean {
  return s.includes("\r") || s.includes("\n");
}

// Extract bare email address from "Display Name <email@domain>" or plain "email@domain"
function extractEmail(s: string): string {
  const m = s.match(/<([^>]+)>/);
  return m ? m[1] : s;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit by user ID: 10 emails/minute per authenticated user
    const limitResult = await tryLimit(crmEmailSendLimiter, user.id);
    if (limitResult && !limitResult.success) {
      return NextResponse.json(
        { error: "För många förfrågningar. Vänta en stund och försök igen." },
        { status: 429, headers: rateLimitHeaders(limitResult) }
      );
    }

    // FROM_EMAIL must be configured on the server — frontend never controls it
    const fromEnv = process.env.FROM_EMAIL;
    if (!fromEnv) {
      console.error("[crm/email/send] FROM_EMAIL env var is not set");
      return NextResponse.json(
        { error: "E-postkonfiguration saknas på servern" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { customerId, subject, message } = body;

    // Validate required fields and lengths
    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json({ error: "customerId krävs" }, { status: 400 });
    }
    if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
      return NextResponse.json({ error: "Ämnesrad krävs" }, { status: 400 });
    }
    if (subject.trim().length > 255) {
      return NextResponse.json({ error: "Ämnesrad får max vara 255 tecken" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Meddelande krävs" }, { status: 400 });
    }
    if (message.trim().length > 10000) {
      return NextResponse.json({ error: "Meddelande får max vara 10 000 tecken" }, { status: 400 });
    }
    if (hasCRLF(subject)) {
      return NextResponse.json({ error: "Ogiltigt ämne" }, { status: 400 });
    }

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    // Verify customer exists and has an email address
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, email, first_name, last_name")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Kunden hittades inte" }, { status: 404 });
    }
    if (!customer.email) {
      return NextResponse.json({ error: "Kunden saknar e-postadress" }, { status: 422 });
    }
    if (hasCRLF(customer.email)) {
      return NextResponse.json({ error: "Kundens e-postadress är ogiltig" }, { status: 422 });
    }

    // from is always controlled server-side from the env variable
    // replyTo is set to the authenticated user's email so replies reach them directly
    const fromAddress = extractEmail(fromEnv);
    const htmlBody = trimmedMessage
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Language" content="sv">
  <title>${trimmedSubject.replace(/</g, "&lt;")}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="white-space: pre-wrap;">${htmlBody}</div>
</body>
</html>`;

    const mailOptions: nodemailer.SendMailOptions = {
      from: fromEnv,
      to: customer.email,
      subject: trimmedSubject,
      text: trimmedMessage,
      html,
      replyTo: user.email ?? undefined,
      headers: { "Content-Language": "sv" },
    };

    const info = await transporter.sendMail(mailOptions);

    // Log to emails table — capture id so customer_interactions can reference it
    const { data: emailLog, error: dbError } = await supabase.from("emails").insert({
      message_id: info.messageId,
      direction: "outbound",
      from_email: fromAddress,
      from_name: "Intenzze",
      to_email: customer.email,
      subject: trimmedSubject,
      body_text: trimmedMessage,
      body_html: html,
      is_read: true,
      customer_id: customerId,
      sent_by: user.id,
      email_date: new Date().toISOString(),
    }).select("id").single();

    if (dbError) {
      // Non-fatal: email was sent, only the log failed
      console.error("[crm/email/send] Kunde inte logga skickat mail:", dbError.message);
    }

    // Log interaction on the customer record
    const { error: interactionError } = await supabase.from("customer_interactions").insert({
      customer_id: customerId,
      type: "email",
      description: `Mail skickat: ${trimmedSubject}`,
      created_by: user.id,
      created_at: new Date().toISOString(),
      email_id: emailLog?.id ?? null,
    });

    if (interactionError) {
      console.error("[crm/email/send] Kunde inte logga interaktion:", interactionError.message);
    }

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("[crm/email/send] Fel:", error);
    return NextResponse.json(
      { error: "Kunde inte skicka mail" },
      { status: 500 }
    );
  }
}
