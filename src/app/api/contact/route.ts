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
    if (!name || !email || !message || !isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    // Svensk kommentar: Bygg mail till din inkorg
    const to = process.env.CONTACT_TO as string;
    const from = process.env.FROM_EMAIL || process.env.GMAIL_USER || "";

    // Viktigt: För Gmail måste "from" normalt matcha ditt konto. Använd samma adress som GMAIL_USER.
    const info = await transporter.sendMail({
      from, // Svensk kommentar: Avsändare måste vara din Gmail-adress
      to, // Svensk kommentar: Mottagare (din inkorg)
      replyTo: email, // Svensk kommentar: Så att “Svara” går till kunden
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

    // Svensk kommentar: Returnera lyckat svar till klienten
    return NextResponse.json({ ok: true, id: info.messageId });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, error: "Mail send failed" },
      { status: 500 }
    );
  }
}
