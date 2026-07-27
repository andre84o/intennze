"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { getCart } from "./domains/actions";

/**
 * Persistent "Till kassan" pill shown on EVERY portal page while the cart has
 * items, so the customer never forgets a reserved domain. The count is refreshed
 * on navigation and immediately on a `portal-cart-changed` event (dispatched by
 * the search page when an item is added). Hidden on the checkout page itself.
 */
export default function PortalCartButton() {
  const pathname = usePathname() ?? "";
  const [count, setCount] = useState(0);

  // Re-read the reservation cookie on every navigation.
  useEffect(() => {
    let alive = true;
    getCart().then((c) => {
      if (alive) setCount(c.totals.count);
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  // Update instantly when an item is added/removed without a navigation.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "number") setCount(detail);
      else getCart().then((c) => setCount(c.totals.count));
    };
    window.addEventListener("portal-cart-changed", onChange);
    return () => window.removeEventListener("portal-cart-changed", onChange);
  }, []);

  if (count <= 0 || pathname.startsWith("/portal/domains/checkout")) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
      <Link
        href="/portal/domains/checkout"
        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25"
      >
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
        Till kassan ({count})
      </Link>
    </div>
  );
}
