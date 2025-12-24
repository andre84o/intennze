import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export interface CompanySettings {
  id?: string;
  company_name: string | null;
  org_number: string | null;
  vat_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  bankgiro: string | null;
  plusgiro: string | null;
  swish: string | null;
  bank_name: string | null;
  bank_account: string | null;
  iban: string | null;
  bic: string | null;
}

// GET - Fetch company settings
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching company settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data || null });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }
}

// POST - Save company settings
export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });
    }

    const settings: CompanySettings = await req.json();

    // Check if settings exist
    const { data: existing } = await supabase
      .from("company_settings")
      .select("id")
      .limit(1)
      .single();

    let result;

    if (existing?.id) {
      // Update existing
      result = await supabase
        .from("company_settings")
        .update({
          company_name: settings.company_name,
          org_number: settings.org_number,
          vat_number: settings.vat_number,
          address: settings.address,
          postal_code: settings.postal_code,
          city: settings.city,
          country: settings.country,
          email: settings.email,
          phone: settings.phone,
          website: settings.website,
          bankgiro: settings.bankgiro,
          plusgiro: settings.plusgiro,
          swish: settings.swish,
          bank_name: settings.bank_name,
          bank_account: settings.bank_account,
          iban: settings.iban,
          bic: settings.bic,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from("company_settings")
        .insert({
          company_name: settings.company_name,
          org_number: settings.org_number,
          vat_number: settings.vat_number,
          address: settings.address,
          postal_code: settings.postal_code,
          city: settings.city,
          country: settings.country,
          email: settings.email,
          phone: settings.phone,
          website: settings.website,
          bankgiro: settings.bankgiro,
          plusgiro: settings.plusgiro,
          swish: settings.swish,
          bank_name: settings.bank_name,
          bank_account: settings.bank_account,
          iban: settings.iban,
          bic: settings.bic,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("Error saving company settings:", result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, settings: result.data });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: "Serverfel" }, { status: 500 });
  }
}
