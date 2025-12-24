export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " kr";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("sv-SE");
};

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

    // Create PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Header - Company name
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246); // Blue
    doc.text((company.company_name || "FÖRETAG").toUpperCase(), margin, y);

    // Invoice title
    doc.setFontSize(24);
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text("FAKTURA", pageWidth - margin, y, { align: "right" });
    y += 15;

    // Divider line
    doc.setDrawColor(229, 231, 235); // Gray-200
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Invoice info section
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128); // Gray-500

    // Left column - Company info
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

    // Right column - Invoice details
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

    // Customer info box
    doc.setFillColor(249, 250, 251); // Gray-50
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

    // Address on the right side of the box
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

    // Items table header
    doc.setFillColor(59, 130, 246); // Blue-500
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Beskrivning", margin + 5, y + 7);
    doc.text("Belopp", pageWidth - margin - 5, y + 7, { align: "right" });
    y += 15;

    // Item row
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);

    const description = invoice.description || `Serviceavtal ${invoice.service_type || "Webbhotell"} - ${periodMonth}`;
    doc.text(description, margin + 5, y);
    doc.text(formatCurrency(invoice.amount), pageWidth - margin - 5, y, { align: "right" });

    y += 10;

    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    // Totals section
    const totalsX = pageWidth - margin - 80;

    doc.setFont("helvetica", "normal");
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
    doc.setFillColor(34, 197, 94); // Green-500
    doc.roundedRect(totalsX - 5, y - 3, pageWidth - margin - totalsX + 10, 12, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("ATT BETALA", totalsX, y + 5);
    doc.text(formatCurrency(invoice.total), pageWidth - margin - 5, y + 5, { align: "right" });

    y += 25;

    // Payment info box
    const hasPaymentInfo = company.bankgiro || company.plusgiro || company.swish;
    if (hasPaymentInfo) {
      doc.setFillColor(254, 243, 199); // Amber-100
      doc.roundedRect(margin, y, contentWidth, 30, 3, 3, "F");

      y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(146, 64, 14); // Amber-800
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
    doc.setTextColor(156, 163, 175); // Gray-400
    doc.text(`Tack för att du är kund hos ${company.company_name || "oss"}!`, pageWidth / 2, y, { align: "center" });
    y += 5;
    if (company.email) {
      doc.text(`Vid frågor, kontakta oss på ${company.email}`, pageWidth / 2, y, { align: "center" });
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="faktura-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { ok: false, error: "Kunde inte generera PDF" },
      { status: 500 }
    );
  }
}
