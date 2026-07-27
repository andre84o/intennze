"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Customer portal navigation. Rendered inside the portal shell, which already
 * gates access to real customers + admin-in-customer-view only — so this nav is
 * customer-only by construction (staff/seller never reach the portal). Active
 * state is derived from the current path.
 */

const LINKS: { href: string; label: string }[] = [
  { href: "/portal", label: "Översikt" },
  { href: "/portal/domains", label: "Domäner" },
  { href: "/portal/domains/search", label: "Sök domän" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  // "Domäner" stays active on detail pages, but not on the /search sibling.
  if (href === "/portal/domains") {
    return pathname === "/portal/domains" || /^\/portal\/domains\/(?!search$).+/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PortalNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav aria-label="Portalnavigering" className="border-b border-slate-800 bg-slate-950/60">
      <ul className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 sm:px-4">
        {LINKS.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-indigo-400 text-white"
                    : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
