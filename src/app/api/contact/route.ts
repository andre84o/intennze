// Svensk kommentar: Nodemailer kräver Node-runtime i Next.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Svensk kommentar: Gmail SMTP-transport med App-lösenord
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Svensk kommentar: Enkel e-postvalidering
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(req: Request) {
  try {
    // Svensk kommentar: Läs in FormData från klientens formulär
    const form = await req.formData();
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const message = String(form.get("message") || "").trim();

    // Svensk kommentar: Fältkrav – ge specifik fel-info per fält
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

    // Svensk kommentar: Miljövariabler måste finnas (säker fall-back)
    const to = process.env.CONTACT_TO;
    const from = process.env.FROM_EMAIL || process.env.GMAIL_USER || "";
    if (!to || !from) {
      return NextResponse.json(
        { ok: false, error: "Servern saknar e-postkonfiguration" },
        { status: 500 }
      );
    }

    // Svensk kommentar: Skicka mail till din inkorg
    const info = await transporter.sendMail({
      from, // Viktigt: för Gmail bör detta matcha GMAIL_USER
      to, // Din mottagaradress
      replyTo: email, // Svar går direkt till kunden
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

    // Svensk kommentar: Klientsvar vid lyckad sändning
    return NextResponse.json({ ok: true, id: info.messageId });
  } catch (err) {
    // Svensk kommentar: Logga internt, returnera generiskt fel externt
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Mail send failed" },
      { status: 500 }
    );
  }
}
