// SECURITY NOTE — xlsx (SheetJS community edition):
//   - Has known npm audit vulnerabilities (Prototype Pollution, ReDoS).
//   - No upstream fix available for the community npm package.
//   - Mitigations in place: server-side only, admin-only route, 3 MB file
//     size limit, 1 000 row limit, not exposed to public upload routes.
//   - Do NOT import xlsx in client components or public-facing routes.
//
// TODO: Replace `xlsx` with a safer/maintained parser, or move XLSX parsing
//       to an isolated worker, if this import endpoint ever becomes public-facing.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Redis } from "@upstash/redis";
import * as XLSX from "xlsx";
import { XMLParser } from "fast-xml-parser";

const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_ROWS = 1000;
const TOKEN_TTL_SECONDS = 3600; // 1 h
const MAX_DISPLAY_NAME = 100;

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

// Normalise an incoming column header → customers field name.
// Keys are lowercase-trimmed versions of expected header names.
const COLUMN_MAP: Record<string, string> = {
  // company_name
  "företagsnamn": "company_name", "foretagsnamn": "company_name",
  "company": "company_name", "company_name": "company_name",
  "business name": "company_name", "businessname": "company_name", "företag": "company_name",
  "bolagsnamn": "company_name",
  // first_name
  "förnamn": "first_name", "fornamn": "first_name",
  "first_name": "first_name", "firstname": "first_name", "first name": "first_name",
  // last_name
  "efternamn": "last_name", "last_name": "last_name", "lastname": "last_name", "last name": "last_name",
  // email
  "e-post": "email", "email": "email", "mail": "email", "epost": "email", "e_post": "email",
  // phone
  "telefon": "phone", "phone": "phone", "mobile": "phone", "tel": "phone",
  "mobil": "phone", "mobilnummer": "phone", "telefonnummer": "phone",
  // address
  "adress": "address", "address": "address", "street": "address", "gatuadress": "address",
  "gata": "address",
  // city
  "ort": "city", "city": "city", "town": "city", "stad": "city",
  // postal_code
  "postnummer": "postal_code", "postal_code": "postal_code", "zip": "postal_code",
  "zipcode": "postal_code", "zip code": "postal_code", "postcode": "postal_code",
  // contact_person
  "kontaktperson": "contact_person", "contact_person": "contact_person",
  "contact": "contact_person", "kontakt": "contact_person", "namn": "contact_person",
  // category
  "kategori": "category", "category": "category", "industry": "category",
  "bransch": "category", "typ": "category",
  // instagram_url
  "instagram": "instagram_url", "instagram_url": "instagram_url",
  // website_url
  "webbplats": "website_url", "website": "website_url", "web": "website_url",
  "url": "website_url", "homepage": "website_url", "hemsida": "website_url",
  "website_url": "website_url", "webbadress": "website_url",
  // status
  "status": "status",
};

function normalizePhone(p: string | null | undefined): string {
  return (p ?? "").replace(/[\s\-().+]/g, "");
}

function mapStatus(raw: string | null | undefined): AllowedStatus {
  if (!raw) return "lead";
  const v = raw.toLowerCase().trim();
  return (ALLOWED_STATUSES as readonly string[]).includes(v)
    ? (v as AllowedStatus)
    : "lead";
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function mapRow(raw: Record<string, unknown>): ParsedRow {
  const mapped: Record<string, string | null> = {};
  for (const [rawKey, rawVal] of Object.entries(raw)) {
    const norm = String(rawKey).trim().toLowerCase();
    const field = COLUMN_MAP[norm];
    if (field && !(field in mapped)) {
      mapped[field] = str(rawVal);
    }
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
    category: mapped.category ? mapped.category.slice(0, 100) : null,
    instagram_url: mapped.instagram_url ? mapped.instagram_url.slice(0, 255) : null,
    website_url: mapped.website_url ? mapped.website_url.slice(0, 255) : null,
    status: mapStatus(mapped.status),
  };
}

// ── File parsers ─────────────────────────────────────────────────────────────

function parseXlsx(bytes: ArrayBuffer): Record<string, unknown>[] {
  const wb = XLSX.read(new Uint8Array(bytes), {
    type: "array",
    sheetRows: MAX_ROWS + 2,
  });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("Filen innehåller inga kalkylblad");
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
}

function parseCsv(bytes: ArrayBuffer): Record<string, unknown>[] {
  // Try UTF-8 first, fall back to ISO-8859-1 (common in Swedish Excel exports)
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("iso-8859-1").decode(bytes);
  }
  const wb = XLSX.read(text, { type: "string" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("CSV-filen kunde inte tolkas");
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
}

function parseXml(bytes: ArrayBuffer): Record<string, unknown>[] {
  const text = Buffer.from(bytes).toString("utf-8");

  // Block entity expansion attacks — case-insensitive
  const upper = text.toUpperCase();
  if (upper.includes("<!DOCTYPE") || upper.includes("<!ENTITY")) {
    throw new Error("Ogiltig XML: DOCTYPE och ENTITY är inte tillåtna");
  }

  const parser = new XMLParser({
    processEntities: false,
    ignoreAttributes: false,
    allowBooleanAttributes: false,
  });

  const parsed = parser.parse(text) as Record<string, unknown>;

  // Recursively find the first array of objects (= the rows)
  function findRows(node: unknown): Record<string, unknown>[] {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) {
      const objs = (node as unknown[]).filter(
        (x) => x && typeof x === "object" && !Array.isArray(x)
      );
      if (objs.length > 0) return objs as Record<string, unknown>[];
      return [];
    }
    const rec = node as Record<string, unknown>;
    // Try array-valued children first (most likely the row list)
    for (const v of Object.values(rec)) {
      if (Array.isArray(v)) {
        const found = findRows(v);
        if (found.length > 0) return found;
      }
    }
    // Recurse into object children
    for (const v of Object.values(rec)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        // Could be a single-row wrapper or deeper nesting
        const inner = v as Record<string, unknown>;
        const innerVals = Object.values(inner);
        // If all inner values are primitives → this is a single row
        if (innerVals.every((iv) => typeof iv !== "object" || iv === null)) {
          return [inner];
        }
        const found = findRows(v);
        if (found.length > 0) return found;
      }
    }
    return [];
  }

  return findRows(parsed);
}

// ── Dedup helpers ─────────────────────────────────────────────────────────────

function isExistingDuplicate(
  row: ParsedRow,
  existingEmails: Set<string>,
  existingPhones: Set<string>,
  existingCompanyCities: Set<string>,
  existingWebsites: Set<string>
): boolean {
  if (row.email && existingEmails.has(row.email.toLowerCase())) return true;
  const ph = normalizePhone(row.phone);
  if (ph.length >= 4 && existingPhones.has(ph)) return true;
  if (row.company_name && row.city) {
    const k = `${row.company_name.toLowerCase()}|${row.city.toLowerCase()}`;
    if (existingCompanyCities.has(k)) return true;
  }
  if (row.website_url && existingWebsites.has(row.website_url.toLowerCase())) return true;
  return false;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Ej autentiserad" }, { status: 401 });
  }

  // 2. Admin check — fail closed if ADMIN_EMAIL is not set
  const adminEmail = process.env.CONTACT_TO;
  if (!adminEmail) {
    return NextResponse.json({ error: "Ej behörig" }, { status: 403 });
  }
  if (user.email !== adminEmail) {
    return NextResponse.json({ error: "Ej behörig" }, { status: 403 });
  }

  // 3. Upstash configured?
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return NextResponse.json({ error: "Import-tjänsten är inte konfigurerad" }, { status: 503 });
  }

  // 4. Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Ingen fil bifogad" }, { status: 400 });
  }

  const displayName = typeof formData.get("displayName") === "string"
    ? (formData.get("displayName") as string).trim().slice(0, MAX_DISPLAY_NAME)
    : "";
  if (!displayName) {
    return NextResponse.json({ error: "Importnamn saknas" }, { status: 400 });
  }

  const defaultCategoryRaw = formData.get("defaultCategory");
  const defaultCategory = typeof defaultCategoryRaw === "string"
    ? defaultCategoryRaw.trim().slice(0, 100)
    : "";

  const maxRowsRaw = formData.get("maxRows");
  const maxRowsLimit = maxRowsRaw ? Math.min(Math.max(1, parseInt(String(maxRowsRaw), 10) || MAX_ROWS), MAX_ROWS) : MAX_ROWS;

  // 5. Validate file size and extension
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Filen är för stor (max 3 MB)" }, { status: 413 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Filen är tom" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["xlsx", "csv", "xml"].includes(ext)) {
    return NextResponse.json(
      { error: "Ogiltigt filformat — använd .xlsx, .csv eller .xml" },
      { status: 400 }
    );
  }

  // 6. Read and parse
  const bytes = await file.arrayBuffer();
  let rawRows: Record<string, unknown>[];
  try {
    if (ext === "xlsx") rawRows = parseXlsx(bytes);
    else if (ext === "csv") rawRows = parseCsv(bytes);
    else rawRows = parseXml(bytes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fel vid parsning av filen";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "Filen innehåller inga rader" }, { status: 400 });
  }
  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `För många rader (max ${MAX_ROWS} per import)` },
      { status: 400 }
    );
  }

  // 7. Map columns and classify
  const allRows = rawRows.map((raw) => {
    const row = mapRow(raw);
    if (defaultCategory) row.category = defaultCategory;
    return row;
  });
  const validRows = allRows.filter((r) => r.first_name.length > 0 || r.company_name);
  const missingRequired = allRows.length - validRows.length;

  // 8. Fetch existing customers for dedup
  const { data: existing } = await supabase
    .from("customers")
    .select("email, phone, company_name, city, website_url");

  const existingEmails = new Set<string>(
    (existing ?? []).filter((c) => c.email).map((c) => c.email!.toLowerCase())
  );
  const existingPhones = new Set<string>(
    (existing ?? []).filter((c) => c.phone).map((c) => normalizePhone(c.phone))
  );
  const existingCompanyCities = new Set<string>(
    (existing ?? [])
      .filter((c) => c.company_name && c.city)
      .map((c) => `${c.company_name!.toLowerCase()}|${c.city!.toLowerCase()}`)
  );
  const existingWebsites = new Set<string>(
    (existing ?? []).filter((c) => c.website_url).map((c) => c.website_url!.toLowerCase())
  );

  // 9. Dedup — also within the file itself
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const seenCompanyCities = new Set<string>();
  const seenWebsites = new Set<string>();
  const toImport: ParsedRow[] = [];
  let duplicates = 0;

  for (const row of validRows) {
    if (isExistingDuplicate(row, existingEmails, existingPhones, existingCompanyCities, existingWebsites)) {
      duplicates++;
      continue;
    }

    const emailKey = row.email?.toLowerCase();
    const phoneKey = normalizePhone(row.phone);
    const companyCityKey =
      row.company_name && row.city
        ? `${row.company_name.toLowerCase()}|${row.city.toLowerCase()}`
        : null;
    const websiteKey = row.website_url?.toLowerCase();

    if (emailKey && seenEmails.has(emailKey)) { duplicates++; continue; }
    if (phoneKey.length >= 4 && seenPhones.has(phoneKey)) { duplicates++; continue; }
    if (companyCityKey && seenCompanyCities.has(companyCityKey)) { duplicates++; continue; }
    if (websiteKey && seenWebsites.has(websiteKey)) { duplicates++; continue; }

    if (emailKey) seenEmails.add(emailKey);
    if (phoneKey.length >= 4) seenPhones.add(phoneKey);
    if (companyCityKey) seenCompanyCities.add(companyCityKey);
    if (websiteKey) seenWebsites.add(websiteKey);

    toImport.push(row);
  }

  // Trim to requested limit before storing
  const limitedToImport = toImport.slice(0, maxRowsLimit);

  // 10. Upload file to private Storage bucket (audit trail)
  // batchId is used as both the Redis token and lead_import_batches PK
  const batchId = crypto.randomUUID();
  const safeName = file.name.replace(/[/\\:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 100);
  // Object key is relative to the bucket — no "lead-imports/" prefix here.
  const storagePath = `${user.id}/${batchId}/${safeName}`;
  let uploadedStoragePath = "";
  let archiveError: string | null = null;
  try {
    const { error: uploadError } = await supabase.storage
      .from("lead-imports")
      .upload(storagePath, new Uint8Array(bytes), {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) {
      // Surface (server-side only) why archiving failed — without this the
      // import silently succeeds but cannot be re-imported later.
      archiveError = uploadError.message;
      console.error("Lead-import: filuppladdning till Storage misslyckades:", uploadError.message);
    } else {
      uploadedStoragePath = storagePath;
    }
  } catch (e) {
    archiveError = e instanceof Error ? e.message : "Okänt fel";
    console.error("Lead-import: filuppladdning kastade undantag:", archiveError);
  }

  // 11. Store parsed rows + metadata in Redis (one-time token = batchId)
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const redisKey = `import-leads:${user.id}:${batchId}`;

  await redis.set(
    redisKey,
    {
      rows: limitedToImport,
      userId: user.id,
      displayName,
      originalFilename: file.name.slice(0, 255),
      fileType: ext,
      fileSize: file.size,
      storagePath: uploadedStoragePath,
    },
    { ex: TOKEN_TTL_SECONDS }
  );

  return NextResponse.json({
    token: batchId,
    summary: {
      total: allRows.length,
      valid: validRows.length,
      missing_required: missingRequired,
      duplicates,
      to_import: limitedToImport.length,
      display_name: displayName,
      archived: !!uploadedStoragePath,
      archive_error: archiveError,
    },
  });
}
