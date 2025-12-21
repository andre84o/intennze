export const runtime = "nodejs";
export const maxDuration = 30;

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Imap from "imap-simple";
import { simpleParser, ParsedMail } from "mailparser";

const IMAP_CONFIG = {
  imap: {
    user: process.env.ZOHO_USER || "",
    password: process.env.ZOHO_PASSWORD || "",
    host: "imap.zoho.eu",
    port: 993,
    tls: true,
    authTimeout: 10000,
    tlsOptions: { rejectUnauthorized: false },
  },
};

export async function POST() {
  console.log("=== FETCHING EMAILS VIA IMAP ===");

  if (!IMAP_CONFIG.imap.user || !IMAP_CONFIG.imap.password) {
    return NextResponse.json(
      { error: "ZOHO_USER och ZOHO_PASSWORD måste vara konfigurerade" },
      { status: 500 }
    );
  }

  let connection: Imap.ImapSimple | null = null;

  try {
    const supabase = await createClient();

    // Kolla senaste hämtade mail för att bara hämta nya
    const { data: latestEmail } = await supabase
      .from("emails")
      .select("email_date")
      .eq("direction", "inbound")
      .order("email_date", { ascending: false })
      .limit(1)
      .single();

    const sinceDate = latestEmail?.email_date
      ? new Date(latestEmail.email_date)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dagar tillbaka

    console.log(`Hämtar mail sedan: ${sinceDate.toISOString()}`);

    // Anslut till IMAP
    connection = await Imap.connect(IMAP_CONFIG);
    await connection.openBox("INBOX");

    // Sök efter mail sedan senaste hämtningen
    const searchCriteria = [["SINCE", sinceDate]];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT", ""],
      markSeen: false,
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    console.log(`Hittade ${messages.length} mail`);

    const newEmails: {
      message_id: string;
      from_email: string;
      from_name: string | null;
      to_email: string;
      subject: string | null;
      body_text: string | null;
      body_html: string | null;
      email_date: string;
    }[] = [];

    for (const message of messages) {
      try {
        const all = message.parts.find((part) => part.which === "");
        if (!all) continue;

        const parsed: ParsedMail = await simpleParser(all.body);

        const messageId = parsed.messageId || `${Date.now()}-${Math.random()}`;

        // Kolla om mailet redan finns
        const { data: existing } = await supabase
          .from("emails")
          .select("id")
          .eq("message_id", messageId)
          .single();

        if (existing) continue;

        const fromAddress = parsed.from?.value?.[0];
        const toAddress = parsed.to?.value?.[0];

        newEmails.push({
          message_id: messageId,
          from_email: fromAddress?.address || "unknown",
          from_name: fromAddress?.name || null,
          to_email: toAddress?.address || IMAP_CONFIG.imap.user,
          subject: parsed.subject || null,
          body_text: parsed.text || null,
          body_html: parsed.html || null,
          email_date: (parsed.date || new Date()).toISOString(),
        });
      } catch (parseError) {
        console.error("Fel vid parsing av mail:", parseError);
      }
    }

    // Spara nya mail till databasen
    if (newEmails.length > 0) {
      const { error } = await supabase.from("emails").insert(
        newEmails.map((email) => ({
          ...email,
          direction: "inbound",
          is_read: false,
        }))
      );

      if (error) {
        console.error("Fel vid sparande av mail:", error);
      } else {
        console.log(`Sparade ${newEmails.length} nya mail`);
      }
    }

    // Hämta alla mail från databasen för att returnera
    const { data: allEmails } = await supabase
      .from("emails")
      .select("*")
      .order("email_date", { ascending: false })
      .limit(100);

    return NextResponse.json({
      success: true,
      newCount: newEmails.length,
      emails: allEmails || [],
    });
  } catch (error) {
    console.error("IMAP fel:", error);
    return NextResponse.json(
      { error: "Kunde inte hämta mail", details: String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch {
        // Ignore close errors
      }
    }
  }
}
