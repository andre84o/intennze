// Svensk kommentar: Nodemailer kräver Node-runtime i Next.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  validateContact,
  contactSubject,
  contactText,
  contactHtml,
  type ContactFormFields,
} from "@/utils/contact";

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

export async function POST(req: Request) {
  try {
    // Svensk kommentar: Läs in FormData från klientens formulär
    const form = await req.formData();
    const fields: ContactFormFields = {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      message: String(form.get("message") || "").trim(),
    };

    // Svensk kommentar: Fältkrav – ge specifik fel-info per fält
    const validation = validateContact(fields);
    if (validation) {
      return NextResponse.json({ ok: false, ...validation }, { status: 400 });
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
      replyTo: fields.email, // Svar går direkt till kunden
      subject: contactSubject(fields.name),
      text: contactText(fields),
      html: contactHtml(fields),
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
