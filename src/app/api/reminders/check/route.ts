export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Supabase admin-klient
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// E-post transport
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.eu",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASSWORD,
  },
});

// Vercel Cron Job - körs varje minut
// Lägg till i vercel.json: { "crons": [{ "path": "/api/reminders/check", "schedule": "* * * * *" }] }
export async function GET(request: Request) {
  // Verifiera att det är ett cron-anrop (Vercel skickar denna header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Tillåt anrop om det är från Vercel cron eller har rätt secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Kolla om det är från Vercel's interna cron
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    if (!isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    // Hämta påminnelser som är inne och inte skickade
    const { data: reminders, error } = await supabaseAdmin
      .from("reminders")
      .select(`
        *,
        customer:customers(first_name, last_name, email, phone)
      `)
      .eq("is_completed", false)
      .eq("notification_sent", false)
      .lte("reminder_date", today);

    if (error) {
      console.error("Error fetching reminders:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filtrera påminnelser där tiden också har passerat
    const dueReminders = reminders?.filter((reminder) => {
      if (reminder.reminder_date < today) return true;
      if (reminder.reminder_date === today) {
        if (!reminder.reminder_time) return true;
        return reminder.reminder_time <= currentTime;
      }
      return false;
    }) || [];

    if (dueReminders.length === 0) {
      return NextResponse.json({ message: "No due reminders", checked: 0 });
    }

    const adminEmail = process.env.CONTACT_TO || process.env.ZOHO_USER;
    const fromEmail = process.env.FROM_EMAIL || process.env.ZOHO_USER;

    if (!adminEmail || !fromEmail) {
      return NextResponse.json({ error: "Email not configured" }, { status: 500 });
    }

    let sentCount = 0;

    for (const reminder of dueReminders) {
      try {
        const customerName = reminder.customer
          ? `${reminder.customer.first_name} ${reminder.customer.last_name}`
          : "Ingen kund kopplad";

        // Skicka e-post
        await transporter.sendMail({
          from: fromEmail,
          to: adminEmail,
          subject: `Påminnelse: ${reminder.title}`,
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #06b6d4, #8b5cf6); padding: 20px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Påminnelse</h1>
              </div>
              <div style="background: #1e293b; padding: 24px; border-radius: 0 0 12px 12px; color: #e2e8f0;">
                <h2 style="color: #22d3ee; margin: 0 0 16px;">${reminder.title}</h2>

                ${reminder.description ? `<p style="color: #94a3b8; margin: 0 0 16px;">${reminder.description}</p>` : ''}

                <div style="background: #334155; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                  <p style="margin: 0 0 8px;"><strong style="color: #22d3ee;">Kund:</strong> ${customerName}</p>
                  ${reminder.customer?.email ? `<p style="margin: 0 0 8px;"><strong style="color: #22d3ee;">E-post:</strong> ${reminder.customer.email}</p>` : ''}
                  ${reminder.customer?.phone ? `<p style="margin: 0;"><strong style="color: #22d3ee;">Telefon:</strong> ${reminder.customer.phone}</p>` : ''}
                </div>

                <p style="color: #64748b; font-size: 14px; margin: 0;">
                  Datum: ${reminder.reminder_date} ${reminder.reminder_time || ''}
                </p>

                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.intenzze.com'}/admin/paminnelser"
                   style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                  Visa i CRM
                </a>
              </div>
            </div>
          `,
        });

        // Markera som skickad
        await supabaseAdmin
          .from("reminders")
          .update({ notification_sent: true })
          .eq("id", reminder.id);

        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send reminder ${reminder.id}:`, emailError);
      }
    }

    return NextResponse.json({
      message: `Sent ${sentCount} reminder notifications`,
      checked: dueReminders.length,
      sent: sentCount,
    });
  } catch (error) {
    console.error("Error in reminder check:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
