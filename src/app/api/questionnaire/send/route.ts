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

export async function POST(req: Request) {
  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "Kund-ID saknas" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the customer
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { ok: false, error: "Kunden hittades inte" },
        { status: 404 }
      );
    }

    if (!customer.email) {
      return NextResponse.json(
        { ok: false, error: "Kunden har ingen e-postadress" },
        { status: 400 }
      );
    }

    const email = process.env.FROM_EMAIL || process.env.ZOHO_USER || "";
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "E-postkonfiguration saknas" },
        { status: 500 }
      );
    }

    const from = `intenzze.webbstudio <${email}>`;

    // Generate public token
    const publicToken = generateToken();
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://intenzze.com";
    const formUrl = `${baseUrl}/formular/${publicToken}`;

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const customerName = `${customer.first_name} ${customer.last_name}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0 0 16px 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">intenzze</h2>
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500; opacity: 0.95;">Berätta om ert projekt</h1>
        </div>

        <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
          <p style="margin-top: 0; font-size: 18px;">Hej ${customerName}!</p>

          <p style="color: #4b5563;">
            För att vi ska kunna ge er det bästa förslaget behöver vi veta lite mer om ert projekt.
          </p>

          <p style="color: #4b5563;">
            Fyll i vårt korta formulär så återkommer vi med en skräddarsydd offert.
          </p>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${formUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);">
              Fyll i formuläret
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 14px; text-align: center;">
            Formuläret tar ca 2-3 minuter att fylla i
          </p>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 14px;">
            <p style="margin: 0;">Har du frågor? Svara på detta mail så hjälper vi dig.</p>
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
      to: customer.email,
      subject: `${customerName} - Berätta om ert webbprojekt`,
      html,
    });

    // Create questionnaire record
    const { data: questionnaire, error: insertError } = await supabase
      .from("questionnaires")
      .insert({
        customer_id: customerId,
        public_token: publicToken,
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_to_email: customer.email,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating questionnaire:", insertError);
      return NextResponse.json(
        { ok: false, error: "Kunde inte spara formuläret" },
        { status: 500 }
      );
    }

    // Log the activity
    await supabase.from("customer_interactions").insert({
      customer_id: customerId,
      type: "email",
      description: `Frågeformulär skickat till ${customer.email}`,
    });

    console.log(`Questionnaire sent to ${customer.email}, ID: ${questionnaire.id}`);

    return NextResponse.json({ ok: true, questionnaireId: questionnaire.id });
  } catch (err) {
    console.error("Questionnaire send error:", err);
    return NextResponse.json(
      { ok: false, error: "Kunde inte skicka formuläret" },
      { status: 500 }
    );
  }
}
