export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.eu",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASSWORD,
  },
});

interface EmailAttachment {
  filename: string;
  content: string; // Base64
  contentType: string;
}

export async function POST(req: Request) {
  try {
    const { to, subject, body, signature, logoHeight = 32, logoPosition = "left", replyToMessageId, attachments } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Mottagare, ämne och meddelande krävs" },
        { status: 400 }
      );
    }

    const email = process.env.FROM_EMAIL || process.env.ZOHO_USER || "";
    if (!email) {
      return NextResponse.json(
        { error: "E-postkonfiguration saknas" },
        { status: 500 }
      );
    }

    const fromName = "Intenzze";
    const from = `${fromName} <${email}>`;

    const supabase = await createClient();

    // Förbered bilagor
    const mailAttachments: any[] = (attachments || []).map((att: EmailAttachment) => ({
      filename: att.filename,
      content: Buffer.from(att.content, "base64"),
      contentType: att.contentType,
    }));

    // Lägg till logotyp som CID-bilaga om den ska visas
    const logoAlign = logoPosition === "center" ? "center" : logoPosition === "right" ? "right" : "left";
    let hasLogo = false;
    
    try {
      const logoPath = path.join(process.cwd(), "public", "logosignatur.png");
      if (fs.existsSync(logoPath)) {
        mailAttachments.push({
          filename: 'logosignatur.png',
          path: logoPath,
          cid: 'logo-signature'
        });
        hasLogo = true;
      }
    } catch (logoError) {
      console.error("Kunde inte läsa logon:", logoError);
    }

    // Konvertera radbrytningar till <br> för korrekt visning
    const formattedSignature = signature ? signature.replace(/\n/g, "<br>") : "";
    const signatureHtml = signature
      ? `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <div style="white-space: pre-wrap;">${formattedSignature}</div>
          ${hasLogo ? `<div style="margin-top: 15px; text-align: ${logoAlign};">
            <img src="cid:logo-signature" alt="Logo" style="height: ${logoHeight}px; width: auto;" />
          </div>` : ""}
        </div>`
      : "";

    const html = `
      <!DOCTYPE html>
      <html lang="sv" xml:lang="sv">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Language" content="sv">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="display:none; font-size:0; line-height:0; max-height:0; mso-hide:all;">
          Detta är ett meddelande från Intenzze Webbstudio. Vi bygger skräddarsydda webbplatser.
        </div>
        <div style="white-space: pre-wrap;">${body}</div>
        ${signatureHtml}
      </body>
      </html>
    `;

    // Skicka mailet
    const mailOptions: nodemailer.SendMailOptions = {
      from,
      to,
      subject,
      text: body + (signature ? `\n\n---\n${signature.replace(/<[^>]*>/g, "")}` : ""),
      html,
      attachments: mailAttachments,
      headers: {
        "Content-Language": "sv",
      },
    };

    // Om det är ett svar, lägg till In-Reply-To header
    if (replyToMessageId) {
      mailOptions.inReplyTo = replyToMessageId;
      mailOptions.references = replyToMessageId;
    }

    const info = await transporter.sendMail(mailOptions);

    // Spara det skickade mailet i databasen
    const { error: dbError } = await supabase.from("emails").insert({
      message_id: info.messageId,
      direction: "outbound",
      from_email: email,
      from_name: fromName,
      to_email: to,
      subject,
      body_text: body,
      body_html: html,
      is_read: true,
      email_date: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Kunde inte spara skickat mail:", dbError);
    }

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Fel vid skickande av mail:", error);
    return NextResponse.json(
      { error: "Kunde inte skicka mail", details: String(error) },
      { status: 500 }
    );
  }
}
