"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function GAListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    // Don't leak token-bearing URLs to GA.
    if (pathname?.startsWith("/offert/") || pathname?.startsWith("/formular/")) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    window.gtag("event", "page_view", {
      page_path: url,
      page_location: window.location.origin + url,
      send_to: "G-EQ9TD4N13S",
    });
  }, [pathname, searchParams]);

  return null;
}
