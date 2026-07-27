"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Globe, Search, ReceiptText, type LucideIcon } from "lucide-react";

/**
 * Mobile-only bottom navigation. The header tab row is hidden on mobile
 * (md:hidden here / hidden md:block on the header nav), so this is the primary
 * portal nav on phones. Icon + 9px label, active state from the current path.
 */

const ITEMS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/portal", label: "Översikt", Icon: LayoutGrid },
  { href: "/portal/domains", label: "Domäner", Icon: Globe },
  { href: "/portal/domains/search", label: "Sök domän", Icon: Search },
  { href: "/portal/domains/orders", label: "Beställningar", Icon: ReceiptText },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  if (href === "/portal/domains") {
    return (
      pathname === "/portal/domains" ||
      /^\/portal\/domains\/(?!search|orders|checkout)/.test(pathname)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PortalBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Portalnavigering"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2 transition-colors ${
                  active ? "text-blue-600" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[9px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
