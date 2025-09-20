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
    const form = await req.formData();
    const fields: ContactFormFields = {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      message: String(form.get("message") || "").trim(),
    };

    const validation = validateContact(fields);
    if (validation) {
      return NextResponse.json({ ok: false, ...validation }, { status: 400 });
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
      replyTo: fields.email, 
      subject: contactSubject(fields.name),
      text: contactText(fields),
      html: contactHtml(fields),
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
