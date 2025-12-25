export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { createClient } from "@/utils/supabase/server";
import * as fs from "fs";
import * as path from "path";

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

    // Header - Company logo
    try {
      const logoPath = path.join(process.cwd(), "public", "logosignatur.png");
      const logoData = fs.readFileSync(logoPath);
      const logoBase64 = logoData.toString("base64");
      // Add logo - width 50mm, height auto (approximately 15mm based on aspect ratio)
      doc.addImage(`data:image/png;base64,${logoBase64}`, "PNG", margin, y - 5, 50, 15);
    } catch {
      // Fallback to text if logo not found
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.text((company.company_name || "FÖRETAG").toUpperCase(), margin, y);
    }

    // Invoice title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55); // Gray-800
    doc.text("FAKTURA", pageWidth - margin, y + 5, { align: "right" });
    y += 18;

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
    doc.text("Ord. pris", pageWidth - margin - 55, y + 7, { align: "right" });
    doc.text("Rabatt", pageWidth - margin - 30, y + 7, { align: "right" });
    doc.text("Belopp", pageWidth - margin - 5, y + 7, { align: "right" });
    y += 15;

    // Parse and display line items
    doc.setFont("helvetica", "normal");
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(10);

    const description = invoice.description || `Serviceavtal ${invoice.service_type || "Webbhotell"} - ${periodMonth}`;
    const lines = description.split("\n");

    let totalOriginalPrice = 0;
    let totalDiscount = 0;

    // Check if lines contain the new format with | separator
    const hasLineItems = lines.some(line => line.includes(" | "));

    if (hasLineItems) {
      lines.forEach((line, index) => {
        // Parse line formats:
        // With discount: "Title: Desc | 1 000 kr | -20% | 800 kr"
        // Without discount: "Title: Desc | 1 000 kr"
        const parts = line.split(" | ");

        // First part is always the title/description
        const titleDescPart = parts[0]?.trim() || line;
        let originalPrice = 0;
        let discountPercent = 0;
        let finalPrice = 0;

        if (parts.length >= 4) {
          // Has discount: Title | OrigPrice | -X% | FinalPrice
          // Parse original price - remove all non-digits except spaces, then parse
          const origPriceStr = parts[1]?.replace(/[^\d\s]/g, "").trim() || "0";
          originalPrice = parseFloat(origPriceStr.replace(/\s/g, "")) || 0;

          // Parse discount percentage
          const discountMatch = parts[2]?.match(/([\d]+)/);
          discountPercent = discountMatch ? parseFloat(discountMatch[1]) : 0;

          // Parse final price
          const finalPriceStr = parts[3]?.replace(/[^\d\s]/g, "").trim() || "0";
          finalPrice = parseFloat(finalPriceStr.replace(/\s/g, "")) || 0;
        } else if (parts.length >= 2) {
          // No discount: Title | Price
          const priceStr = parts[1]?.replace(/[^\d\s]/g, "").trim() || "0";
          originalPrice = parseFloat(priceStr.replace(/\s/g, "")) || 0;
          finalPrice = originalPrice;
        }

        const discountAmount = originalPrice - finalPrice;
        totalOriginalPrice += originalPrice;
        totalDiscount += discountAmount;

        // Draw row background for alternating rows
        if (index % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y - 4, contentWidth, 8, "F");
        }

        doc.setTextColor(31, 41, 55);
        doc.setFont("helvetica", "normal");

        // Title/Description ONLY (truncate if too long)
        const maxDescWidth = contentWidth - 95;
        let displayText = titleDescPart;
        while (doc.getTextWidth(displayText) > maxDescWidth && displayText.length > 0) {
          displayText = displayText.slice(0, -1);
        }
        if (displayText !== titleDescPart) displayText += "...";
        doc.text(displayText, margin + 5, y);

        // Original price column
        if (discountPercent > 0 && originalPrice > 0) {
          doc.setTextColor(156, 163, 175); // Gray
          doc.text(formatCurrency(originalPrice), pageWidth - margin - 55, y, { align: "right" });

          // Discount column
          doc.setTextColor(22, 163, 74); // Green
          doc.text(`-${discountPercent}%`, pageWidth - margin - 30, y, { align: "right" });
        } else {
          doc.setTextColor(156, 163, 175);
          doc.text("-", pageWidth - margin - 55, y, { align: "right" });
          doc.text("-", pageWidth - margin - 30, y, { align: "right" });
        }

        // Final price column (Belopp)
        doc.setTextColor(31, 41, 55);
        doc.setFont("helvetica", "bold");
        doc.text(formatCurrency(finalPrice), pageWidth - margin - 5, y, { align: "right" });

        y += 8;
      });
    } else {
      // Simple description without line items (old format or service invoices)
      // Truncate description if too long
      const maxDescWidth = contentWidth - 95;
      let displayDesc = description;
      while (doc.getTextWidth(displayDesc) > maxDescWidth && displayDesc.length > 0) {
        displayDesc = displayDesc.slice(0, -1);
      }
      if (displayDesc !== description) displayDesc += "...";

      doc.text(displayDesc, margin + 5, y);
      doc.setTextColor(156, 163, 175);
      doc.text("-", pageWidth - margin - 55, y, { align: "right" });
      doc.text("-", pageWidth - margin - 30, y, { align: "right" });
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(invoice.amount), pageWidth - margin - 5, y, { align: "right" });
      y += 8;
      totalOriginalPrice = invoice.amount;
    }

    y += 5;

    // Divider
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Totals section
    const totalsX = pageWidth - margin - 80;

    // Show original total and discount if there was a discount
    if (totalDiscount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(156, 163, 175);
      doc.text("Ordinarie pris", totalsX, y);
      doc.text(formatCurrency(totalOriginalPrice), pageWidth - margin - 5, y, { align: "right" });
      y += 7;

      doc.setTextColor(22, 163, 74); // Green
      doc.setFont("helvetica", "bold");
      doc.text("Rabatt", totalsX, y);
      doc.text(`-${formatCurrency(totalDiscount)}`, pageWidth - margin - 5, y, { align: "right" });
      y += 7;

      // Divider line
      doc.setDrawColor(229, 231, 235);
      doc.line(totalsX, y, pageWidth - margin, y);
      y += 7;
    }

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

    // Add MAKULERAD watermark if invoice is cancelled
    if (invoice.status === "cancelled") {
      const pageHeight = doc.internal.pageSize.getHeight();

      // Create a graphics state with transparency
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const GState = (doc as any).GState;
      const gState = new GState({ opacity: 0.3 });
      doc.setGState(gState);

      // Draw large red MAKULERAD text in center of page
      doc.setFontSize(70);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38); // Red-600

      // Draw text with rotation using jsPDF's text rotation option
      doc.text("MAKULERAD", pageWidth / 2, pageHeight / 2, {
        align: "center",
        angle: 45,
      });

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
