export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";


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

export async function POST(req: Request) {
  try {
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

    const from = `"intenzze.webbstudio" <${emailConfig}>`;

    const info = await transporter.sendMail({
      from, 
      to, 
      replyTo: email, 
      subject: `Nytt kontaktmeddelande från ${name}`,
      text: `Namn: ${name}\nE-post: ${email}\nTelefon: ${phone}\n\nMeddelande:\n${message}`,
      html: `
        <!DOCTYPE html>
        <html lang="sv">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; margin:0; padding:20px;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="margin:0 0 8px">Nytt kontaktmeddelande</h2>
            <p><strong>Namn:</strong> ${name}</p>
            <p><strong>E-post:</strong> ${email}</p>
            <p><strong>Telefon:</strong> ${phone}</p>
            <p><strong>Meddelande:</strong></p>
            <p style="white-space:pre-line">${message}</p>
          </div>
        </body>
        </html>
      `,
    });

    
    return NextResponse.json({ ok: true, id: info.messageId });
  } catch (err) {
  
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Mail send failed" },
      { status: 500 }
    );
  }
}
