import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Public endpoint — use anon key. The `anon_insert_page_views` RLS policy
// permits inserts; no service role needed. Service role on a public endpoint
// would bypass RLS and is unnecessary for analytics writes.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Length caps to prevent abuse / unbounded writes.
const truncate = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  return v.slice(0, max);
};

function getDeviceType(userAgent: string): "desktop" | "mobile" | "tablet" {
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)) return "mobile";
  return "desktop";
}

function getBrowser(userAgent: string): string {
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("SamsungBrowser")) return "Samsung";
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
  if (userAgent.includes("Edge")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  return "Other";
}

function getOS(userAgent: string): string {
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Mac OS")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  return "Other";
}

function getSource(referrer: string | null, utmSource: string | null): "direct" | "google" | "facebook" | "instagram" | "linkedin" | "other" {
  if (utmSource) {
    const src = utmSource.toLowerCase();
    if (src.includes("google")) return "google";
    if (src.includes("facebook") || src.includes("fb")) return "facebook";
    if (src.includes("instagram") || src.includes("ig")) return "instagram";
    if (src.includes("linkedin")) return "linkedin";
  }

  if (!referrer || referrer === "") return "direct";

  const ref = referrer.toLowerCase();
  if (ref.includes("google")) return "google";
  if (ref.includes("facebook") || ref.includes("fb.com")) return "facebook";
  if (ref.includes("instagram")) return "instagram";
  if (ref.includes("linkedin")) return "linkedin";
  if (ref.includes("bing") || ref.includes("yahoo") || ref.includes("duckduckgo")) return "google"; // Group search engines

  return "other";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const pagePath = truncate(body.pagePath, 512);
    const pageTitle = truncate(body.pageTitle, 256);
    const visitorId = truncate(body.visitorId, 128);
    const sessionId = truncate(body.sessionId, 128);
    const referrerRaw = truncate(body.referrer, 512);
    const utmSource = truncate(body.utmSource, 128);
    const utmMedium = truncate(body.utmMedium, 128);
    const utmCampaign = truncate(body.utmCampaign, 128);

    // visitorId is required for the RLS policy and for meaningful analytics.
    if (!visitorId) {
      return NextResponse.json({ ok: false, error: "visitorId required" }, { status: 400 });
    }

    // Don't track admin/login or token-bearing public pages.
    if (
      pagePath?.startsWith("/admin") ||
      pagePath?.startsWith("/login") ||
      pagePath?.startsWith("/offert/") ||
      pagePath?.startsWith("/formular/")
    ) {
      return NextResponse.json({ ok: true, tracked: false });
    }

    const userAgent = req.headers.get("user-agent") || "";

    const pageView = {
      page_path: pagePath,
      page_title: pageTitle,
      visitor_id: visitorId,
      session_id: sessionId,
      device_type: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      os: getOS(userAgent),
      referrer: referrerRaw,
      source: getSource(referrerRaw, utmSource),
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    };

    const { error } = await supabase.from("page_views").insert(pageView);

    if (error) {
      console.error("Analytics tracking error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tracked: true });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
