/**
 * Canonical public site URL, shared by `sitemap.ts`, `robots.ts` and anywhere
 * else that needs an absolute base. Prefers `NEXT_PUBLIC_SITE_URL` (single source
 * of truth) but keeps a hardcoded production fallback so a missing/empty env var
 * can never emit a broken sitemap. Trailing slashes are stripped.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://www.intenzze.com";
