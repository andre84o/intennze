export const runtime = "nodejs";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";
import path from "path";
import fs from "fs";
import { createClient } from "@/utils/supabase/server";

interface CompanySettings {
  company_name: string | null;
  org_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  bankgiro: string | null;
  plusgiro: string | null;
  swish: string | null;
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " kr";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("sv-SE");
};

// Generate PDF for invoice
function generateInvoicePDF(invoice: {
  invoice_number: number;
  invoice_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  description: string | null;
  service_type: string | null;
  customer?: {
    first_name: string;
    last_name: string;
    company_name: string | null;
    org_number: string | null;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    email: string | null;
  };
}, company: CompanySettings): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(59, 130, 246);
  doc.text((company.company_name || "FÖRETAG").toUpperCase(), margin, y);

  doc.setTextColor(31, 41, 55);
  doc.text("FAKTURA", pageWidth - margin, y, { align: "right" });
  y += 15;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Company and invoice info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(107, 114, 128);

  let companyY = y;
  if (company.company_name) {
    doc.text(company.company_name, margin, companyY);
    companyY += 5;
  }
  if (company.address) {
    doc.text(company.address, margin, companyY);
    companyY += 5;
  }
  if (company.postal_code || company.city) {
    doc.text(`${company.postal_code || ""} ${company.city || ""}`.trim(), margin, companyY);
    companyY += 5;
  }
  if (company.email) {
    doc.text(company.email, margin, companyY);
  }

  const rightCol = pageWidth - margin - 60;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  doc.text("Fakturanummer:", rightCol, y);
  doc.text("Fakturadatum:", rightCol, y + 6);
  doc.text("Förfallodatum:", rightCol, y + 12);
  doc.text("Period:", rightCol, y + 18);

  doc.setFont("helvetica", "normal");
  doc.text(`#${invoice.invoice_number}`, pageWidth - margin, y, { align: "right" });
  doc.text(formatDate(invoice.invoice_date), pageWidth - margin, y + 6, { align: "right" });
  doc.text(formatDate(invoice.due_date), pageWidth - margin, y + 12, { align: "right" });

  const periodStart = new Date(invoice.period_start);
  const periodMonth = periodStart.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });
  doc.text(periodMonth, pageWidth - margin, y + 18, { align: "right" });

  y += 35;

  // Customer box
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, "F");

  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("FAKTURERAS TILL", margin + 5, y);

  y += 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(31, 41, 55);
  const customerName = `${invoice.customer?.first_name || ""} ${invoice.customer?.last_name || ""}`.trim();
  doc.text(customerName, margin + 5, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (invoice.customer?.company_name) {
    doc.text(invoice.customer.company_name, margin + 5, y);
    y += 5;
  }

  if (invoice.customer?.org_number) {
    doc.setTextColor(107, 114, 128);
    doc.text(`Org.nr: ${invoice.customer.org_number}`, margin + 5, y);
    y += 5;
  }

  const addressX = margin + contentWidth / 2;
  let addressY = y - (invoice.customer?.company_name ? 15 : 10);
  doc.setTextColor(75, 85, 99);

  if (invoice.customer?.address) {
    doc.text(invoice.customer.address, addressX, addressY);
    addressY += 5;
  }
  if (invoice.customer?.postal_code || invoice.customer?.city) {
    const cityLine = `${invoice.customer?.postal_code || ""} ${invoice.customer?.city || ""}`.trim();
    doc.text(cityLine, addressX, addressY);
    addressY += 5;
  }
  if (invoice.customer?.email) {
    doc.text(invoice.customer.email, addressX, addressY);
  }

  y += 20;

  // Table header
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Beskrivning", margin + 5, y + 7);
  doc.text("Belopp", pageWidth - margin - 5, y + 7, { align: "right" });
  y += 15;

  // Item
  doc.setFont("helvetica", "normal");
  doc.setTextColor(31, 41, 55);
  const description = invoice.description || `Serviceavtal ${invoice.service_type || "Webbhotell"} - ${periodMonth}`;
  doc.text(description, margin + 5, y);
  doc.text(formatCurrency(invoice.amount), pageWidth - margin - 5, y, { align: "right" });

  y += 10;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Totals
  const totalsX = pageWidth - margin - 80;

  doc.setTextColor(107, 114, 128);
  doc.text("Summa exkl. moms", totalsX, y);
  doc.setTextColor(31, 41, 55);
  doc.text(formatCurrency(invoice.amount), pageWidth - margin - 5, y, { align: "right" });
  y += 7;

  doc.setTextColor(107, 114, 128);
  doc.text(`Moms (${invoice.vat_rate}%)`, totalsX, y);
  doc.setTextColor(31, 41, 55);
  doc.text(formatCurrency(invoice.vat_amount), pageWidth - margin - 5, y, { align: "right" });
  y += 10;

  // Total box
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(totalsX - 5, y - 3, pageWidth - margin - totalsX + 10, 12, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("ATT BETALA", totalsX, y + 5);
  doc.text(formatCurrency(invoice.total), pageWidth - margin - 5, y + 5, { align: "right" });

  y += 25;

  // Payment info
  const hasPaymentInfo = company.bankgiro || company.plusgiro || company.swish;
  if (hasPaymentInfo) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, y, contentWidth, 30, 3, 3, "F");

    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(146, 64, 14);
    doc.text("Betalningsinformation", margin + 5, y);

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    let paymentX = margin + 5;
    if (company.bankgiro) {
      doc.text(`Bankgiro: ${company.bankgiro}`, paymentX, y);
      paymentX += 55;
    }
    if (company.plusgiro) {
      doc.text(`Plusgiro: ${company.plusgiro}`, paymentX, y);
      paymentX += 55;
    }
    if (company.swish) {
      doc.text(`Swish: ${company.swish}`, paymentX, y);
    }
    y += 5;
    doc.text(`Ange fakturanummer #${invoice.invoice_number} vid betalning`, margin + 5, y);

    y += 20;
  } else {
    y += 10;
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(`Tack för att du är kund hos ${company.company_name || "oss"}!`, pageWidth / 2, y, { align: "center" });
  y += 5;
  if (company.email) {
    doc.text(`Vid frågor, kontakta oss på ${company.email}`, pageWidth / 2, y, { align: "center" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

export async function POST(req: Request) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { ok: false, error: "Faktura-ID saknas" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the invoice with customer data
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, customer:customers(*)")
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { ok: false, error: "Fakturan hittades inte" },
        { status: 404 }
      );
    }

    if (!invoice.customer?.email) {
      return NextResponse.json(
        { ok: false, error: "Kunden har ingen e-postadress" },
        { status: 400 }
      );
    }

    // Get company settings
    const { data: companySettings } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    const company: CompanySettings = companySettings || {
      company_name: "Ditt Företag",
      org_number: null,
      address: null,
      postal_code: null,
      city: null,
      country: "Sverige",
      email: null,
      phone: null,
      bankgiro: null,
      plusgiro: null,
      swish: null,
    };

    const email = process.env.FROM_EMAIL || process.env.ZOHO_USER || "";
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "E-postkonfiguration saknas" },
        { status: 500 }
      );
    }

    const from = `${company.company_name || "Företag"} <${email}>`;
    const customerName = `${invoice.customer.first_name} ${invoice.customer.last_name}`;

    const periodStart = new Date(invoice.period_start);
    const periodMonth = periodStart.toLocaleDateString("sv-SE", { month: "long", year: "numeric" });

    // Generate PDF
    const pdfBuffer = generateInvoicePDF(invoice, company);

    // Prepare attachments with explicit type
    const attachments: Array<{
      filename: string;
      content?: Buffer;
      contentType?: string;
      path?: string;
      cid?: string;
    }> = [
      {
        filename: `faktura-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ];

    // Try to add logo
    let hasLogo = false;
    try {
      const logoPath = path.join(process.cwd(), "public", "logosignatur.png");
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: "logosignatur.png",
          path: logoPath,
          cid: "logo-signature",
        });
        hasLogo = true;
      }
    } catch (logoError) {
      console.error("Kunde inte läsa logon:", logoError);
    }

    // Build payment info HTML
    const paymentInfoHtml = (company.bankgiro || company.plusgiro || company.swish) ? `
          <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #166534;">Betalningsinformation</p>
            ${company.bankgiro ? `<p style="margin: 0; color: #166534;">Bankgiro: ${company.bankgiro}</p>` : ""}
            ${company.plusgiro ? `<p style="margin: 4px 0 0 0; color: #166534;">Plusgiro: ${company.plusgiro}</p>` : ""}
            ${company.swish ? `<p style="margin: 4px 0 0 0; color: #166534;">Swish: ${company.swish}</p>` : ""}
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #15803d;">Ange fakturanummer #${invoice.invoice_number} vid betalning</p>
          </div>
    ` : "";

    // Build footer location
    const footerLocation = [company.city, company.country].filter(Boolean).join(", ") || "";

    const html = `
      <!DOCTYPE html>
      <html lang="sv" xml:lang="sv">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="Content-Language" content="sv">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="display:none; font-size:0; line-height:0; max-height:0; mso-hide:all;">
          Faktura #${invoice.invoice_number} för ${periodMonth} från ${company.company_name || "oss"}.
        </div>

        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Faktura #${invoice.invoice_number}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${periodMonth}</p>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin-top: 0;">Hej ${customerName},</p>
          <p>Här kommer din faktura för ${periodMonth}.</p>

          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Beskrivning</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500;">${invoice.description || `Serviceavtal ${invoice.service_type || "Webbhotell"}`}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Belopp exkl. moms</td>
                <td style="padding: 8px 0; text-align: right;">${formatCurrency(invoice.amount)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Moms (${invoice.vat_rate}%)</td>
                <td style="padding: 8px 0; text-align: right;">${formatCurrency(invoice.vat_amount)}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 0 0 0; font-weight: bold; font-size: 18px;">Att betala</td>
                <td style="padding: 12px 0 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #22c55e;">${formatCurrency(invoice.total)}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>Förfallodatum:</strong> ${formatDate(invoice.due_date)}
            </p>
          </div>

          ${paymentInfoHtml}

          <p style="text-align: center; color: #6b7280; margin-top: 24px;">
            Fakturan finns bifogad som PDF.
          </p>
        </div>

        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 14px;">
          ${hasLogo ? `<img src="cid:logo-signature" alt="${company.company_name || "Logo"}" style="height: 32px; width: auto; margin-bottom: 12px;" />` : ""}
          <p style="margin: 0;">${company.company_name || ""}</p>
          ${footerLocation ? `<p style="margin: 4px 0 0 0;">${footerLocation}</p>` : ""}
        </div>
      </body>
      </html>
    `;

    // Send email
    await transporter.sendMail({
      from,
      to: invoice.customer.email,
      subject: `Faktura #${invoice.invoice_number} - ${periodMonth}`,
      html,
      attachments,
      headers: {
        "Content-Language": "sv",
      },
    });

    // Update invoice status
    await supabase
      .from("invoices")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Invoice send error:", err);
    return NextResponse.json(
      { ok: false, error: "Kunde inte skicka fakturan" },
      { status: 500 }
    );
  }
}
