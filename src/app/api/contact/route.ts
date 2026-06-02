export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { sendMetaEvent } from "@/lib/meta/capi";

// Rate limiter: 2 requests per 15 minutes per IP
// Only initialize if Upstash is configured
const ratelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(2, "15 m"),
      analytics: true,
    })
  : null;

// Telegram notification
async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (error) {
    console.error("[Telegram] Fel:", error);
  }
}


const transporter = nodemailer.createTransport({
  host: "smtp.zoho.eu",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASSWORD,
  },
});


const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export async function POST(req: Request) {
  try {
    // Rate limiting - only if Upstash is configured
    if (ratelimit) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ??
                 req.headers.get("x-real-ip") ??
                 "anonymous";

      const { success, limit, reset, remaining } = await ratelimit.limit(ip);

      if (!success) {
        return NextResponse.json(
          { ok: false, error: "För många förfrågningar. Försök igen senare." },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": limit.toString(),
              "X-RateLimit-Remaining": remaining.toString(),
              "X-RateLimit-Reset": reset.toString(),
            }
          }
        );
      }
    }

    const form = await req.formData();
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const message = String(form.get("message") || "").trim();

    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { ok: false, field: "email", error: "Ogiltig e-postadress" },
        { status: 400 }
      );
    }
    if (!name) {
      return NextResponse.json(
        { ok: false, field: "name", error: "Fyll i ditt namn" },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { ok: false, field: "phone", error: "Fyll i ditt telefonnummer" },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json(
        { ok: false, field: "message", error: "Skriv ett meddelande" },
        { status: 400 }
      );
    }

    const to = process.env.CONTACT_TO;
    const emailConfig = process.env.FROM_EMAIL || process.env.ZOHO_USER || "";
    if (!to || !emailConfig) {
      return NextResponse.json(
        { ok: false, error: "Servern saknar e-postkonfiguration" },
        { status: 500 }
      );
    }

    const from = `Intenzze <${emailConfig}>`;

    const info = await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject: `Nytt kontaktmeddelande från ${name}`,
      text: `Namn: ${name}\nE-post: ${email}\nTelefon: ${phone}\n\nMeddelande:\n${message}`,
      headers: {
        "Content-Language": "sv",
      },
      html: `
        <!DOCTYPE html>
        <html lang="sv" xml:lang="sv">
        <head>
          <meta charset="utf-8">
          <meta http-equiv="Content-Language" content="sv">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; margin:0; padding:20px;">
          <div style="display:none; font-size:0; line-height:0; max-height:0; mso-hide:all;">
            Detta är ett kontaktmeddelande från Intenzze Webbstudio. Vi bygger skräddarsydda webbplatser.
          </div>
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="margin:0 0 8px">Nytt kontaktmeddelande</h2>
            <p><strong>Namn:</strong> ${escapeHtml(name)}</p>
            <p><strong>E-post:</strong> ${escapeHtml(email)}</p>
            <p><strong>Telefon:</strong> ${escapeHtml(phone)}</p>
            <p><strong>Meddelande:</strong></p>
            <p style="white-space:pre-line">${escapeHtml(message)}</p>
          </div>
        </body>
        </html>
      `,
    });

    // Skicka Telegram-notifiering
    await sendTelegramNotification(
      `📬 <b>Nytt kontaktmeddelande!</b>\n\n` +
      `👤 <b>Namn:</b> ${name}\n` +
      `📞 <b>Telefon:</b> ${phone}\n` +
      `📧 <b>E-post:</b> ${email}\n\n` +
      `💬 <b>Meddelande:</b>\n${message}\n\n` +
      `🔗 <a href="https://intenzze.com/admin/crm">Öppna CRM</a>`
    );

    // Server-side Meta Lead (Conversions API), deduped against the browser
    // pixel via the shared event_id the form generated. Hashing + sending lives
    // in the CAPI helper. Never block or fail the user response on tracking.
    try {
      const metaEventId = String(form.get("meta_event_id") || "") || undefined;
      const fbp = String(form.get("meta_fbp") || "") || undefined;
      const fbc = String(form.get("meta_fbc") || "") || undefined;
      const eventSourceUrl =
        String(form.get("meta_event_source_url") || "") ||
        req.headers.get("referer") ||
        undefined;
      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        undefined;
      const clientUserAgent = req.headers.get("user-agent") || undefined;
      const [firstName, ...rest] = name.split(/\s+/);

      await sendMetaEvent({
        eventName: "Lead",
        actionSource: "website",
        eventId: metaEventId,
        eventSourceUrl,
        user: {
          email,
          phone,
          firstName: firstName || null,
          lastName: rest.join(" ") || null,
          country: "se",
          fbp,
          fbc,
          clientIp,
          clientUserAgent,
        },
        customData: { lead_source: "contact_form" },
      });
    } catch (e) {
      console.error("[Meta CAPI] contact Lead failed:", e);
    }

    return NextResponse.json({ ok: true, id: info.messageId });
  } catch (err) {
  
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Mail send failed" },
      { status: 500 }
    );
  }
}
