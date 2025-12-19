export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
  }).format(amount);
};

export async function POST(req: Request) {
  try {
    const { quoteId } = await req.json();

    if (!quoteId) {
      return NextResponse.json(
        { ok: false, error: "Offert-ID saknas" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the quote with customer and items
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*, customer:customers(*), items:quote_items(*)")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { ok: false, error: "Offerten hittades inte" },
        { status: 404 }
      );
    }

    if (!quote.customer?.email) {
      return NextResponse.json(
        { ok: false, error: "Kunden har ingen e-postadress" },
        { status: 400 }
      );
    }

    const from = process.env.FROM_EMAIL || process.env.ZOHO_USER || "";
    if (!from) {
      return NextResponse.json(
        { ok: false, error: "E-postkonfiguration saknas" },
        { status: 500 }
      );
    }

    // Build items HTML
    const itemsHtml = (quote.items || [])
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
      .map(
        (item: { description: string; details: string | null; quantity: number; unit: string; unit_price: number; total: number }) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${item.description}</strong>
            ${item.details ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280; white-space: pre-line;">${item.details}</p>` : ""}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; vertical-align: top;">${item.quantity} ${item.unit}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: top;">${formatCurrency(item.unit_price)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: top;">${formatCurrency(item.total)}</td>
        </tr>
      `
      )
      .join("");

    const customerName = `${quote.customer.first_name} ${quote.customer.last_name}`;

    // Generate public token for customer response
    const publicToken = quote.public_token || generateToken();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://intenzze.com";
    const quoteUrl = `${baseUrl}/offert/${publicToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Offert #${quote.quote_number}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${quote.title}</p>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin-top: 0;">Hej ${customerName},</p>
          <p>Tack för ditt intresse! Här kommer offerten som vi diskuterat.</p>

          ${quote.description ? `<p style="color: #6b7280;">${quote.description}</p>` : ""}

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Beskrivning</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600;">Antal</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600;">Á-pris</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600;">Summa</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Subtotal (exkl. moms)</span>
                <span>${formatCurrency(quote.subtotal)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #6b7280;">Moms (${quote.vat_rate}%)</span>
                <span>${formatCurrency(quote.vat_amount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; padding-top: 12px; border-top: 2px solid #1f2937;">
                <span>Totalt</span>
                <span>${formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>Giltig t.o.m.:</strong> ${quote.valid_until || "Tillsvidare"}
            </p>
          </div>

          ${
            quote.terms
              ? `
            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px;">Villkor</h3>
              <p style="color: #6b7280; white-space: pre-line; margin: 0;">${quote.terms}</p>
            </div>
          `
              : ""
          }

          <div style="margin-top: 32px; text-align: center; padding: 24px; background: #f0fdf4; border-radius: 12px;">
            <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #166534;">Är du redo att gå vidare?</p>
            <a href="${quoteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Se offert och godkänn</a>
            <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">Eller <a href="${quoteUrl}" style="color: #2563eb;">klicka här</a> för att avböja</p>
          </div>

          <div style="margin-top: 24px; text-align: center;">
            <p style="color: #6b7280;">Har du frågor? Kontakta oss gärna!</p>
          </div>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px;">
          <p style="margin: 0;">Intenzze Webbstudio</p>
          <p style="margin: 4px 0 0 0;">Stockholm, Sverige</p>
        </div>
      </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from,
      to: quote.customer.email,
      subject: `Offert #${quote.quote_number} - ${quote.title}`,
      html,
    });

    // Update quote status and save token
    await supabase
      .from("quotes")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_to_email: quote.customer.email,
        public_token: publicToken,
      })
      .eq("id", quoteId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Quote send error:", err);
    return NextResponse.json(
      { ok: false, error: "Kunde inte skicka offerten" },
      { status: 500 }
    );
  }
}
