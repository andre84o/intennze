import "server-only";
import crypto from "crypto";

// ── Meta Conversions API helper ──────────────────────────────────────────────
// Single place that hashes PII and sends server-side events. Used by both the
// website Lead (action_source "website", deduped against the browser pixel via
// a shared event_id) and the CRM funnel events (action_source
// "system_generated", matched via lead_id).
//
// SECURITY: PII (email/phone/name/...) is SHA-256 hashed before it leaves the
// server, per Meta's requirements. Never log raw values. fbp/fbc/ip/ua are
// transport identifiers and are sent un-hashed, as Meta requires.

const META_PIXEL_ID = process.env.META_PIXEL_ID || "";
const META_ACCESS_TOKEN =
  process.env.META_CAPI_ACCESS_TOKEN ||
  process.env.META_ACCESS_TOKEN ||
  process.env.FACEBOOK_ACCESS_TOKEN ||
  "";
const META_API_VERSION = "v24.0";

export function isMetaConfigured(): boolean {
  return Boolean(META_PIXEL_ID && META_ACCESS_TOKEN);
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// Hash a normalised personal field (lowercased + trimmed).
function hashField(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = value.toLowerCase().trim();
  if (!normalised) return undefined;
  return sha256(normalised);
}

// Normalise to E.164-ish digits with Swedish country code, then hash.
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "46" + cleaned.substring(1);
  if (cleaned.length <= 10) cleaned = "46" + cleaned;
  return cleaned;
}

function hashPhone(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined;
  const normalised = normalizePhone(phone);
  return normalised ? sha256(normalised) : undefined;
}

// Convert a country name/code to a hashed 2-letter ISO code.
function hashCountry(country: string | null | undefined): string | undefined {
  if (!country) return undefined;
  const c = country.toLowerCase().trim();
  if (!c) return undefined;
  const code = c === "sverige" || c === "sweden" ? "se" : c.slice(0, 2);
  return sha256(code);
}

export interface MetaUserInput {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  externalId?: string | null;
  /** Meta lead_id from a Lead Ad (offline match key). */
  leadId?: string | null;
  /** _fbp cookie value (un-hashed). */
  fbp?: string | null;
  /** _fbc cookie value, already in `fb.1.<ts>.<fbclid>` form (un-hashed). */
  fbc?: string | null;
  /** Client IP (un-hashed). */
  clientIp?: string | null;
  /** Client user agent (un-hashed). */
  clientUserAgent?: string | null;
}

export type MetaActionSource =
  | "website"
  | "system_generated"
  | "app"
  | "phone_call"
  | "chat"
  | "email"
  | "physical_store"
  | "other";

export interface SendMetaEventParams {
  eventName: string;
  actionSource: MetaActionSource;
  /** Shared dedup key with the browser pixel. */
  eventId?: string;
  eventSourceUrl?: string;
  /** Unix seconds. Defaults to now. */
  eventTime?: number;
  user: MetaUserInput;
  customData?: Record<string, unknown>;
}

function buildUserData(user: MetaUserInput): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const em = hashField(user.email);
  const ph = hashPhone(user.phone);
  const fn = hashField(user.firstName);
  const ln = hashField(user.lastName);
  const ct = hashField(user.city);
  const zp = hashField(user.postalCode);
  const country = hashCountry(user.country);
  const externalId = hashField(user.externalId);

  if (em) data.em = [em];
  if (ph) data.ph = [ph];
  if (fn) data.fn = [fn];
  if (ln) data.ln = [ln];
  if (ct) data.ct = [ct];
  if (zp) data.zp = [zp];
  if (country) data.country = [country];
  if (externalId) data.external_id = [externalId];
  if (user.leadId) data.lead_id = user.leadId;
  if (user.fbp) data.fbp = user.fbp;
  if (user.fbc) data.fbc = user.fbc;
  if (user.clientIp) data.client_ip_address = user.clientIp;
  if (user.clientUserAgent) data.client_user_agent = user.clientUserAgent;

  return data;
}

export interface SendMetaEventResult {
  ok: boolean;
  eventsReceived?: number;
  error?: string;
}

export async function sendMetaEvent(
  params: SendMetaEventParams
): Promise<SendMetaEventResult> {
  if (!isMetaConfigured()) {
    return { ok: false, error: "not_configured" };
  }

  const eventData = {
    data: [
      {
        event_name: params.eventName,
        event_time: params.eventTime ?? Math.floor(Date.now() / 1000),
        action_source: params.actionSource,
        ...(params.eventId ? { event_id: params.eventId } : {}),
        ...(params.eventSourceUrl ? { event_source_url: params.eventSourceUrl } : {}),
        user_data: buildUserData(params.user),
        ...(params.customData ? { custom_data: params.customData } : {}),
      },
    ],
  };

  const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });
    const result = await response.json();

    if (!response.ok) {
      console.error("[Meta CAPI] request failed:", result?.error?.message || "unknown error");
      return { ok: false, error: "request_failed" };
    }
    return { ok: true, eventsReceived: result.events_received ?? 1 };
  } catch (error) {
    console.error("[Meta CAPI] network error:", error);
    return { ok: false, error: "network_error" };
  }
}

// Build a Meta `_fbc` value from a raw fbclid (used when the cookie isn't
// available but the click id is). Format: fb.1.<unix_ms>.<fbclid>.
export function buildFbcFromFbclid(fbclid: string, timestampMs?: number): string {
  return `fb.1.${timestampMs ?? Date.now()}.${fbclid}`;
}
