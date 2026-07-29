import type { NextConfig } from "next";

// ── Content-Security-Policy ──────────────────────────────────────────────────
// Built as an allowlist that covers every third party already loaded by the
// app so nothing breaks:
//   • Supabase (REST/Realtime/Storage) — origin derived from the public env var
//   • Google: gtag.js, GTM, GA4/Ads beacons, DoubleClick
//   • Meta Pixel (connect.facebook.net) + pixel image/CAPI beacons
//   • Stripe.js (js.stripe.com) + api.stripe.com + Stripe Checkout iframe
// script-src keeps 'unsafe-inline'/'unsafe-eval' because the app ships inline
// GTM/gtag/pixel bootstrap snippets and Next.js inline runtime scripts; a
// nonce-based tightening is the recommended follow-up hardening step.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHttp = "https://*.supabase.co";
let supabaseWss = "wss://*.supabase.co";
try {
  if (supabaseUrl) {
    const origin = new URL(supabaseUrl).origin;
    supabaseHttp = origin;
    supabaseWss = origin.replace(/^https:/, "wss:");
  }
} catch {
  // Fall back to the wildcard hosts above if the env var is malformed/unset.
}

const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'none'`,
  `form-action 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://js.stripe.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https:`,
  `font-src 'self' data:`,
  `worker-src 'self' blob:`,
  `frame-src 'self' https://js.stripe.com https://www.googletagmanager.com https://td.doubleclick.net`,
  [
    `connect-src 'self'`,
    supabaseHttp,
    supabaseWss,
    `https://www.google-analytics.com`,
    `https://*.google-analytics.com`,
    `https://*.analytics.google.com`,
    `https://www.googletagmanager.com`,
    `https://*.googletagmanager.com`,
    `https://connect.facebook.net`,
    `https://*.facebook.com`,
    `https://api.stripe.com`,
    `https://stats.g.doubleclick.net`,
    `https://*.g.doubleclick.net`,
  ].join(" "),
  `upgrade-insecure-requests`,
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig = {
  // Ensure Turbopack selects this workspace as the root (fixes asset resolution for public/)
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
} satisfies NextConfig as NextConfig;

export default nextConfig;
