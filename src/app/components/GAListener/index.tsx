"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function GAListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    window.gtag("config", "G-EQ9TD4N13S", { page_path: url });
  }, [pathname, searchParams]);

  return null;
}
