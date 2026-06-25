// Consent state is stored by react-cookie-consent in this cookie as the literal
// string "true" (accepted) or "false" (declined). Absent = no choice made yet.
// Keep this name in sync with <CookieBanner />'s `cookieName`.
export const CONSENT_COOKIE = "intenzze-consent";

export type ConsentState = "granted" | "denied" | "unknown";

// Pure, runs on server or client — used by the root layout to read the cookie
// server-side and by readConsentCookie() below.
export function parseConsent(raw: string | undefined | null): ConsentState {
  if (raw === "true") return "granted";
  if (raw === "false") return "denied";
  return "unknown";
}

export function readConsentCookie(): ConsentState {
  if (typeof document === "undefined") return "unknown";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`)
  );
  return parseConsent(match ? decodeURIComponent(match[1]) : undefined);
}

// react-cookie-consent writes the cookie but gives no reactive signal, so the
// banner dispatches this event on accept/decline. That lets tracking flip on
// (or stay off) immediately, with no page reload. The reactive hook that listens
// for it lives in useConsent.ts (client-only); this module stays React-free so
// the root server layout can import parseConsent without a "use client" bundle.
export const CONSENT_EVENT = "intenzze:consent-change";

export function emitConsentChange(state: ConsentState): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ConsentState>(CONSENT_EVENT, { detail: state })
  );
}
