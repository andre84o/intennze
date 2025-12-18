"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function getVisitorId(): string {
  if (typeof window === "undefined") return "";

  let visitorId = localStorage.getItem("visitor_id");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("visitor_id", visitorId);
  }
  return visitorId;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("session_id", sessionId);
  }
  return sessionId;
}

export default function Analytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Don't track admin or login pages
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/login")) {
      return;
    }

    const trackPageView = async () => {
      try {
        const referrer = document.referrer;
        const utmSource = searchParams?.get("utm_source");
        const utmMedium = searchParams?.get("utm_medium");
        const utmCampaign = searchParams?.get("utm_campaign");

        await fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pagePath: pathname,
            pageTitle: document.title,
            visitorId: getVisitorId(),
            sessionId: getSessionId(),
            referrer,
            utmSource,
            utmMedium,
            utmCampaign,
          }),
        });
      } catch (err) {
        // Silently fail - don't break the site if tracking fails
        console.error("Analytics tracking failed:", err);
      }
    };

    // Small delay to ensure page has loaded
    const timer = setTimeout(trackPageView, 100);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}
