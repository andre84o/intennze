export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Redis } from "@upstash/redis";
import { revalidatePath } from "next/cache";

const CHUNK_SIZE = 100;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_STATUSES = ["lead", "contacted", "customer", "churned"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

interface StoredRow {
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

interface RedisPayload {
  rows: unknown[];
  userId: string;
}

function normalizePhone(p: string | null | undefined): string {
  return (p ?? "").replace(/[\s\-().+]/g, "");
}

function sanitizeRow(raw: unknown): StoredRow {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Ogiltig rad i import-data");
  }
  const r = raw as Record<string, unknown>;
  const s = String(r.status ?? "lead").toLowerCase().trim();
  const status: AllowedStatus = (ALLOWED_STATUSES as readonly string[]).includes(s)
    ? (s as AllowedStatus)
    : "lead";
  const t = (v: unknown, max: number): string | null => {
    if (typeof v !== "string" || v.trim() === "") return null;
    return v.trim().slice(0, max);
  };
  return {
    company_name: t(r.company_name, 255),
    first_name: (typeof r.first_name === "string" ? r.first_name.trim() : "").slice(0, 100),
    last_name: (typeof r.last_name === "string" ? r.last_name.trim() : "").slice(0, 100),
    email: t(r.email, 255),
    phone: t(r.phone, 50),
    address: t(r.address, 255),
    city: t(r.city, 100),
    postal_code: t(r.postal_code, 20),
    contact_person: t(r.contact_person, 255),
    category: t(r.category, 100),
    instagram_url: t(r.instagram_url, 255),
    website_url: t(r.website_url, 255),
    status,
  };
}

function isExistingDuplicate(
  row: StoredRow,
  existingEmails: Set<string>,
  existingPhones: Set<string>,
  existingCompanyCities: Set<string>,
  existingWebsites: Set<string>
): boolean {
  if (row.email && existingEmails.has(row.email.toLowerCase())) return true;
  const ph = normalizePhone(row.phone);
  if (ph.length >= 4 && existingPhones.has(ph)) return true;
  if (row.company_name && row.city) {
    if (existingCompanyCities.has(`${row.company_name.toLowerCase()}|${row.city.toLowerCase()}`))
      return true;
  }
  if (row.website_url && existingWebsites.has(row.website_url.toLowerCase())) return true;
  return false;
}

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

  // 4. Parse request body
  let token: string;
  try {
    const body = await req.json() as Record<string, unknown>;
    if (!body.token || typeof body.token !== "string") throw new Error();
    token = body.token;
  } catch {
    return NextResponse.json({ error: "Ogiltig förfrågan" }, { status: 400 });
  }

  // 5. Validate token format (UUID v4) — prevent Redis key injection
  if (!UUID_RE.test(token)) {
    return NextResponse.json({ error: "Ogiltig token" }, { status: 400 });
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const redisKey = `import-leads:${user.id}:${token}`;

  // 6. Fetch then delete — one-time use token
  const stored = await redis.get<RedisPayload>(redisKey);
  await redis.del(redisKey); // Always delete, even on failure

  if (!stored) {
    return NextResponse.json({ error: "Token är ogiltig eller har gått ut" }, { status: 400 });
  }

  // 7. Ownership check (belt-and-suspenders; key already namespaced by user.id)
  if (stored.userId !== user.id) {
    return NextResponse.json({ error: "Token tillhör inte din session" }, { status: 403 });
  }

  if (!Array.isArray(stored.rows) || stored.rows.length === 0) {
    return NextResponse.json({ error: "Inga rader att importera" }, { status: 400 });
  }

  // 8. Sanitize rows — re-validate all types and lengths from Redis
  let rows: StoredRow[];
  try {
    rows = stored.rows.map(sanitizeRow);
  } catch {
    return NextResponse.json({ error: "Ogiltig data i import-token" }, { status: 400 });
  }

  // 9. Fresh dedup check against current DB state
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

  const rowsToInsert = rows.filter(
    (row) => !isExistingDuplicate(row, existingEmails, existingPhones, existingCompanyCities, existingWebsites)
  );
  const skipped = rows.length - rowsToInsert.length;

  // 10. Batch insert in chunks of 100
  let inserted = 0;
  for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
    const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE).map((row) => ({
      ...row,
      source: "xml_import",
      created_by: user.id,
      has_purchased: false,
      has_service_agreement: false,
      is_read: false,
    }));
    const { error } = await supabase.from("customers").insert(chunk);
    if (!error) inserted += chunk.length;
    // Continue on chunk error — partial import beats complete failure
  }

  // 11. Invalidate Next.js router cache for CRM
  revalidatePath("/admin/crm");

  return NextResponse.json({ inserted, skipped });
}
