// Typed Meta Pixel helpers
declare global {
  interface Window {
    fbq?: (
      method: "track" | "init" | "trackCustom" | string,
      eventName?: string,
      params?: Record<string, unknown>,
      options?: { eventID?: string }
    ) => void;
  }
}

// Single source of truth for the Pixel ID. Override per-env with
// NEXT_PUBLIC_META_PIXEL_ID; falls back to the production dataset.
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1537867027358765";

// Raw (un-hashed) advanced-matching fields. The browser pixel normalises and
// SHA-256 hashes these client-side before they leave the device, so we pass
// plain values here — never log or persist them.
export interface AdvancedMatching {
  em?: string; // email
  ph?: string; // phone
  fn?: string; // first name
  ln?: string; // last name
  ct?: string; // city
  zp?: string; // postal code
  country?: string;
  external_id?: string;
}

interface TrackOptions {
  /** Shared dedup key — pass the SAME id to the server CAPI event. */
  eventID?: string;
  /** Advanced-matching user data attached to this conversion. */
  userData?: AdvancedMatching;
}

// Generate a dedup id shared between the browser pixel and the server CAPI
// event so Meta collapses them into one conversion.
export function genEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `evt_${Date.now()}_${Math.round(Math.random() * 1e9)}`;
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// _fbp / _fbc are first-party cookies the pixel sets automatically. Reading
// them lets the server CAPI event carry the same browser identity → better
// attribution and dedup.
export const getFbp = (): string | undefined => readCookie("_fbp");
export const getFbc = (): string | undefined => readCookie("_fbc");

// Apply advanced matching by re-initing the pixel with user data. The SDK
// merges this into subsequent events on the same pixel.
function applyAdvancedMatching(userData?: AdvancedMatching): void {
  if (!userData) return;
  const clean = Object.fromEntries(
    Object.entries(userData).filter(([, v]) => typeof v === "string" && v.trim() !== "")
  );
  if (Object.keys(clean).length === 0) return;
  window.fbq?.("init", META_PIXEL_ID, clean);
}

export function trackContact(opts?: TrackOptions): void {
  if (typeof window === "undefined") return;
  applyAdvancedMatching(opts?.userData);
  window.fbq?.("track", "Contact", undefined, opts?.eventID ? { eventID: opts.eventID } : undefined);
}

export function trackLead(
  data?: Record<string, unknown>,
  opts?: TrackOptions
): void {
  if (typeof window === "undefined") return;
  applyAdvancedMatching(opts?.userData);
  window.fbq?.("track", "Lead", data, opts?.eventID ? { eventID: opts.eventID } : undefined);
}

export function trackViewContent(contentName: string, contentCategory?: string): void {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "ViewContent", {
    content_name: contentName,
    content_category: contentCategory,
  });
}

// Standard PageView for client-side (SPA) route changes. The initial load is
// already tracked by the inline pixel script in the root layout.
export function trackPageView(): void {
  if (typeof window === "undefined") return;
  window.fbq?.("track", "PageView");
}

export function track(
  method: "track" | "init" | "trackCustom" | string,
  eventName?: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  window.fbq?.(method, eventName, params);
}
