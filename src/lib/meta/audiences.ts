import "server-only";
import crypto from "crypto";
import { normalizePhone } from "@/lib/meta/capi";

// ── Meta Custom Audiences (Marketing API) ────────────────────────────────────
// Builds a Data File Custom Audience (DFCA) from CRM segments and uploads hashed
// customer rows so the segment can be used for retargeting / lookalikes in Ads
// Manager.
//
// SECURITY: every personal field (email/phone/name/city/zip/country) is
// normalised and SHA-256 hashed before it leaves the server, exactly as the
// Custom Audience API requires. EXTERN_ID (our customer id) is an opaque
// identifier and is sent un-hashed, per Meta's spec. Never log raw values.
//
// This needs an access token with the `ads_management` scope and an ad account
// id — distinct from the CAPI/pixel credentials — so it has its own config.

const META_API_VERSION = "v24.0";

const META_AD_ACCOUNT_ID = (process.env.META_AD_ACCOUNT_ID || "").replace(/^act_/, "");
const META_MARKETING_ACCESS_TOKEN =
  process.env.META_MARKETING_ACCESS_TOKEN ||
  process.env.META_CAPI_ACCESS_TOKEN ||
  process.env.META_ACCESS_TOKEN ||
  "";

export function isMetaAudienceConfigured(): boolean {
  return Boolean(META_AD_ACCOUNT_ID && META_MARKETING_ACCESS_TOKEN);
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// Hash a normalised personal field (lowercased + trimmed). Returns "" for empty
// values — Meta expects an empty string (not a hash) for a missing column.
function hashField(value: string | null | undefined): string {
  if (!value) return "";
  const normalised = value.toLowerCase().trim();
  return normalised ? sha256(normalised) : "";
}

// Meta wants city/name fields stripped of punctuation and whitespace.
function hashName(value: string | null | undefined): string {
  if (!value) return "";
  const normalised = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalised ? sha256(normalised) : "";
}

function hashPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const normalised = normalizePhone(phone);
  return normalised ? sha256(normalised) : "";
}

function hashCountry(country: string | null | undefined): string {
  if (!country) return "";
  const c = country.toLowerCase().trim();
  if (!c) return "";
  const code = c === "sverige" || c === "sweden" ? "se" : c.slice(0, 2);
  return sha256(code);
}

export interface AudienceUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

// Column order shared by every uploaded row. EXTERN_ID stays un-hashed.
const AUDIENCE_SCHEMA = [
  "EMAIL",
  "PHONE",
  "FN",
  "LN",
  "CT",
  "ZIP",
  "COUNTRY",
  "EXTERN_ID",
] as const;

function buildRow(user: AudienceUser): string[] {
  return [
    hashField(user.email),
    hashPhone(user.phone),
    hashName(user.firstName),
    hashName(user.lastName),
    hashName(user.city),
    hashField(user.postalCode),
    hashCountry(user.country),
    user.id, // EXTERN_ID — opaque, not hashed
  ];
}

// A row only matches if it carries at least one real identifier (email/phone).
export function hasUsableIdentifier(user: AudienceUser): boolean {
  return Boolean(user.email || user.phone);
}

export interface CreateAudienceResult {
  ok: boolean;
  audienceId?: string;
  error?: string;
}

export async function createCustomAudience(
  name: string,
  description?: string
): Promise<CreateAudienceResult> {
  if (!isMetaAudienceConfigured()) return { ok: false, error: "not_configured" };

  const url = `https://graph.facebook.com/${META_API_VERSION}/act_${META_AD_ACCOUNT_ID}/customaudiences`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        subtype: "CUSTOM",
        description: description || "Skapad från Intenzze CRM",
        customer_file_source: "USER_PROVIDED_ONLY",
        access_token: META_MARKETING_ACCESS_TOKEN,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result?.id) {
      console.error("[Meta Audience] create failed:", result?.error?.message || "unknown error");
      return { ok: false, error: "create_failed" };
    }
    return { ok: true, audienceId: result.id };
  } catch (error) {
    console.error("[Meta Audience] create network error:", error);
    return { ok: false, error: "network_error" };
  }
}

export interface AddUsersResult {
  ok: boolean;
  numReceived?: number;
  numInvalid?: number;
  error?: string;
}

// Uploads hashed rows to an existing DFCA. Meta caps a single request at 10k
// rows, so we batch. Adds are idempotent — re-uploading the same user is a
// no-op, which makes "re-sync" safe to run repeatedly.
export async function addUsersToAudience(
  audienceId: string,
  users: AudienceUser[]
): Promise<AddUsersResult> {
  if (!isMetaAudienceConfigured()) return { ok: false, error: "not_configured" };

  const rows = users.filter(hasUsableIdentifier).map(buildRow);
  if (rows.length === 0) return { ok: true, numReceived: 0, numInvalid: 0 };

  const BATCH = 10000;
  let numReceived = 0;
  let numInvalid = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const url = `https://graph.facebook.com/${META_API_VERSION}/${audienceId}/users`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: { schema: AUDIENCE_SCHEMA, data: batch },
          access_token: META_MARKETING_ACCESS_TOKEN,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("[Meta Audience] add users failed:", result?.error?.message || "unknown error");
        return { ok: false, error: "upload_failed", numReceived, numInvalid };
      }
      numReceived += result?.num_received ?? batch.length;
      numInvalid += result?.num_invalid_entries ?? 0;
    } catch (error) {
      console.error("[Meta Audience] add users network error:", error);
      return { ok: false, error: "network_error", numReceived, numInvalid };
    }
  }

  return { ok: true, numReceived, numInvalid };
}
