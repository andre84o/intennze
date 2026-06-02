"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/utils/metaPixel";

// Fires a standard Meta `PageView` on client-side (SPA) navigation. The very
// first page load is already tracked by the inline pixel script in the root
// layout, so we skip the initial render to avoid a double-count.
//
// Excludes admin/login/token-bearing paths (no PII in tracking) and /demo
// (client showcase sites must not pollute the intenzze ad dataset).
const EXCLUDED = ["/admin", "/login", "/offert/", "/formular/", "/demo/"];

export default function MetaRouteListener() {
  const pathname = usePathname();
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }
    if (!pathname || EXCLUDED.some((p) => pathname.startsWith(p))) return;
    trackPageView();
  }, [pathname]);

  return null;
}
