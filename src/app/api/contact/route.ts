export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});


const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
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
    if (!message) {
      return NextResponse.json(
        { ok: false, field: "message", error: "Skriv ett meddelande" },
        { status: 400 }
      );
    }

    const to = process.env.CONTACT_TO;
    const from = process.env.FROM_EMAIL || process.env.GMAIL_USER || "";
    if (!to || !from) {
      return NextResponse.json(
        { ok: false, error: "Servern saknar e-postkonfiguration" },
        { status: 500 }
      );
    }

    const info = await transporter.sendMail({
      from, 
      to, 
      replyTo: email, 
      subject: `Nytt kontaktmeddelande från ${name}`,
      text: `Namn: ${name}\nE-post: ${email}\n\nMeddelande:\n${message}`,
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
          <h2 style="margin:0 0 8px">Nytt kontaktmeddelande</h2>
          <p><strong>Namn:</strong> ${name}</p>
          <p><strong>E-post:</strong> ${email}</p>
          <p style="white-space:pre-line">${message}</p>
        </div>
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
