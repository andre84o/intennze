"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function GAListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't leak token-bearing URLs to GA.
    if (pathname?.startsWith("/offert/") || pathname?.startsWith("/formular/")) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Exactly one page_view per navigation. gtag() may not exist yet on the very
    // first render (the config script loads afterInteractive), so instead of
    // dropping the initial landing page_view we poll briefly until gtag is ready.
    let sent = false;
    const send = () => {
      if (sent || typeof window.gtag !== "function") return false;
      sent = true;
      window.gtag("event", "page_view", {
        page_path: url,
        page_location: window.location.origin + url,
        send_to: "G-EQ9TD4N13S",
      });
      return true;
    };

    if (send()) return;

    const interval = setInterval(() => {
      if (send()) clearInterval(interval);
    }, 200);
    // Give up after ~10s so we never leak the interval.
    const timeout = setTimeout(() => clearInterval(interval), 10000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pathname, searchParams]);

  return null;
}
