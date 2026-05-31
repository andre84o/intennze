export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Redis } from "@upstash/redis";
import * as XLSX from "xlsx";
import { XMLParser } from "fast-xml-parser";

const MAX_ROWS = 1000;
const TOKEN_TTL_SECONDS = 3600;

const ALLOWED_STATUSES = ["lead", "contacted", "customer", "churned"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

interface ParsedRow {
  company_name: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  contact_person: string | null;
  category: string | null;
  instagram_url: string | null;
  website_url: string | null;
  status: AllowedStatus;
}

const COLUMN_MAP: Record<string, string> = {
  "företagsnamn": "company_name", "foretagsnamn": "company_name",
  "company": "company_name", "company_name": "company_name",
  "business name": "company_name", "businessname": "company_name", "företag": "company_name",
  "bolagsnamn": "company_name",
  "förnamn": "first_name", "fornamn": "first_name",
  "first_name": "first_name", "firstname": "first_name", "first name": "first_name",
  "efternamn": "last_name", "last_name": "last_name", "lastname": "last_name", "last name": "last_name",
  "e-post": "email", "email": "email", "mail": "email", "epost": "email", "e_post": "email",
  "telefon": "phone", "phone": "phone", "mobile": "phone", "tel": "phone",
  "mobil": "phone", "mobilnummer": "phone", "telefonnummer": "phone",
  "adress": "address", "address": "address", "street": "address", "gatuadress": "address", "gata": "address",
  "ort": "city", "city": "city", "town": "city", "stad": "city",
  "postnummer": "postal_code", "postal_code": "postal_code", "zip": "postal_code",
  "zipcode": "postal_code", "zip code": "postal_code", "postcode": "postal_code",
  "kontaktperson": "contact_person", "contact_person": "contact_person",
  "contact": "contact_person", "kontakt": "contact_person", "namn": "contact_person",
  "kategori": "category", "category": "category", "industry": "category", "bransch": "category", "typ": "category",
  "instagram": "instagram_url", "instagram_url": "instagram_url",
  "webbplats": "website_url", "website": "website_url", "web": "website_url",
  "url": "website_url", "homepage": "website_url", "hemsida": "website_url",
  "website_url": "website_url", "webbadress": "website_url",
  "status": "status",
};

function normalizePhone(p: string | null | undefined): string {
  return (p ?? "").replace(/[\s\-().+]/g, "");
}

function mapStatus(raw: string | null | undefined): AllowedStatus {
  if (!raw) return "lead";
  const v = raw.toLowerCase().trim();
  return (ALLOWED_STATUSES as readonly string[]).includes(v) ? (v as AllowedStatus) : "lead";
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function mapRow(raw: Record<string, unknown>, defaultCategory?: string): ParsedRow {
  const mapped: Record<string, string | null> = {};
  for (const [rawKey, rawVal] of Object.entries(raw)) {
    const norm = String(rawKey).trim().toLowerCase();
    const field = COLUMN_MAP[norm];
    if (field && !(field in mapped)) mapped[field] = str(rawVal);
  }
  const companyName = mapped.company_name ?? null;
  const firstName = mapped.first_name ?? (companyName ? companyName.slice(0, 100) : null);
  return {
    company_name: companyName ? companyName.slice(0, 255) : null,
    first_name: (firstName ?? "").slice(0, 100),
    last_name: (mapped.last_name ?? "").slice(0, 100),
    email: mapped.email ? mapped.email.slice(0, 255) : null,
    phone: mapped.phone ? mapped.phone.slice(0, 50) : null,
    address: mapped.address ? mapped.address.slice(0, 255) : null,
    city: mapped.city ? mapped.city.slice(0, 100) : null,
    postal_code: mapped.postal_code ? mapped.postal_code.slice(0, 20) : null,
    contact_person: mapped.contact_person ? mapped.contact_person.slice(0, 255) : null,
    category: defaultCategory || (mapped.category ? mapped.category.slice(0, 100) : null),
    instagram_url: mapped.instagram_url ? mapped.instagram_url.slice(0, 255) : null,
    website_url: mapped.website_url ? mapped.website_url.slice(0, 255) : null,
    status: mapStatus(mapped.status),
  };
}

function parseBytes(bytes: ArrayBuffer, ext: string): Record<string, unknown>[] {
  if (ext === "xlsx") {
    const wb = XLSX.read(new Uint8Array(bytes), { type: "array", sheetRows: MAX_ROWS + 2 });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error("Filen innehåller inga kalkylblad");
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  }
  if (ext === "csv") {
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { text = new TextDecoder("iso-8859-1").decode(bytes); }
    const wb = XLSX.read(text, { type: "string" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error("CSV-filen kunde inte tolkas");
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  }
  // xml
  const text = Buffer.from(bytes).toString("utf-8");
  const upper = text.toUpperCase();
  if (upper.includes("<!DOCTYPE") || upper.includes("<!ENTITY")) {
    throw new Error("Ogiltig XML");
  }
  const parser = new XMLParser({ processEntities: false, ignoreAttributes: false });
  const parsed = parser.parse(text) as Record<string, unknown>;
  function findRows(node: unknown): Record<string, unknown>[] {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) {
      const objs = (node as unknown[]).filter(x => x && typeof x === "object" && !Array.isArray(x));
      if (objs.length > 0) return objs as Record<string, unknown>[];
      return [];
    }
    const rec = node as Record<string, unknown>;
    for (const v of Object.values(rec)) {
      if (Array.isArray(v)) { const f = findRows(v); if (f.length > 0) return f; }
    }
    for (const v of Object.values(rec)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const inner = v as Record<string, unknown>;
        if (Object.values(inner).every(iv => typeof iv !== "object" || iv === null)) return [inner];
        const f = findRows(v); if (f.length > 0) return f;
      }
    }
    return [];
  }
  return findRows(parsed);
}

function isExistingDuplicate(
  row: ParsedRow,
  emails: Set<string>, phones: Set<string>,
  companyCities: Set<string>, websites: Set<string>
): boolean {
  if (row.email && emails.has(row.email.toLowerCase())) return true;
  const ph = normalizePhone(row.phone);
  if (ph.length >= 4 && phones.has(ph)) return true;
  if (row.company_name && row.city && companyCities.has(`${row.company_name.toLowerCase()}|${row.city.toLowerCase()}`)) return true;
  if (row.website_url && websites.has(row.website_url.toLowerCase())) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });

  const adminEmail = process.env.CONTACT_TO;
  if (!adminEmail || user.email !== adminEmail) return NextResponse.json({ error: "Ej behörig" }, { status: 403 });

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return NextResponse.json({ error: "Import-tjänsten är inte konfigurerad" }, { status: 503 });
  }

  let batchId: string;
  try {
    const body = await req.json() as Record<string, unknown>;
    if (!body.batchId || typeof body.batchId !== "string") throw new Error();
    batchId = body.batchId;
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 });
  }

  // Fetch batch metadata
  const { data: batch, error: batchError } = await supabase
    .from("lead_import_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) return NextResponse.json({ error: "Import hittades inte" }, { status: 404 });
  if (!batch.storage_path) return NextResponse.json({ error: "Ingen fil sparad för denna import" }, { status: 400 });

  // Download file from Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("lead-imports")
    .download(batch.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Kunde inte ladda filen från Storage" }, { status: 500 });
  }

  const bytes = await fileData.arrayBuffer();
  const ext = batch.file_type || batch.original_filename.split(".").pop()?.toLowerCase() || "xlsx";

  let rawRows: Record<string, unknown>[];
  try {
    rawRows = parseBytes(bytes, ext);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fel vid parsning" }, { status: 400 });
  }

  if (rawRows.length === 0) return NextResponse.json({ error: "Filen innehåller inga rader" }, { status: 400 });

  // Use original batch's category as default
  const defaultCategory = batch.display_name ? undefined : undefined; // keep original file's category
  const allRows = rawRows.map(raw => mapRow(raw, defaultCategory));
  const validRows = allRows.filter(r => r.first_name.length > 0 || r.company_name);
  const missingRequired = allRows.length - validRows.length;

  // Fresh dedup
  const { data: existing } = await supabase.from("customers").select("email, phone, company_name, city, website_url");
  const existingEmails = new Set<string>((existing ?? []).filter(c => c.email).map(c => c.email!.toLowerCase()));
  const existingPhones = new Set<string>((existing ?? []).filter(c => c.phone).map(c => normalizePhone(c.phone)));
  const existingCompanyCities = new Set<string>((existing ?? []).filter(c => c.company_name && c.city).map(c => `${c.company_name!.toLowerCase()}|${c.city!.toLowerCase()}`));
  const existingWebsites = new Set<string>((existing ?? []).filter(c => c.website_url).map(c => c.website_url!.toLowerCase()));

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const seenCompanyCities = new Set<string>();
  const seenWebsites = new Set<string>();
  const toImport: ParsedRow[] = [];
  let duplicates = 0;

  for (const row of validRows) {
    if (isExistingDuplicate(row, existingEmails, existingPhones, existingCompanyCities, existingWebsites)) { duplicates++; continue; }
    const ek = row.email?.toLowerCase();
    const pk = normalizePhone(row.phone);
    const cck = row.company_name && row.city ? `${row.company_name.toLowerCase()}|${row.city.toLowerCase()}` : null;
    const wk = row.website_url?.toLowerCase();
    if (ek && seenEmails.has(ek)) { duplicates++; continue; }
    if (pk.length >= 4 && seenPhones.has(pk)) { duplicates++; continue; }
    if (cck && seenCompanyCities.has(cck)) { duplicates++; continue; }
    if (wk && seenWebsites.has(wk)) { duplicates++; continue; }
    if (ek) seenEmails.add(ek);
    if (pk.length >= 4) seenPhones.add(pk);
    if (cck) seenCompanyCities.add(cck);
    if (wk) seenWebsites.add(wk);
    toImport.push(row);
  }

  // New Redis token for this re-import
  const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
  const newBatchId = crypto.randomUUID();
  const redisKey = `import-leads:${user.id}:${newBatchId}`;

  await redis.set(redisKey, {
    rows: toImport,
    userId: user.id,
    displayName: `${batch.display_name} (re-import)`,
    originalFilename: batch.original_filename,
    fileType: batch.file_type,
    fileSize: batch.file_size,
    storagePath: batch.storage_path,
  }, { ex: TOKEN_TTL_SECONDS });

  return NextResponse.json({
    token: newBatchId,
    summary: {
      total: allRows.length,
      valid: validRows.length,
      missing_required: missingRequired,
      duplicates,
      to_import: toImport.length,
      display_name: batch.display_name,
    },
  });
}
