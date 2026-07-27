"use client";

import Image from "next/image";
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
  { href: "/portal/domains/checkout", label: "Kundkorg" },
  { href: "/portal/domains/orders", label: "Beställningar" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  // "Domäner" stays active on a domain detail page, but not on the search /
  // orders / checkout siblings (which have their own or no nav entry).
  if (href === "/portal/domains") {
    return (
      pathname === "/portal/domains" ||
      /^\/portal\/domains\/(?!search|orders|checkout)/.test(pathname)
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function PortalNav() {
  const pathname = usePathname() ?? "";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/portal" className="flex items-center" aria-label="Intenzze – till portalen">
            <Image
              src="/logony22.png"
              alt="Intenzze"
              width={260}
              height={65}
              className="md:h-25 h-20 w-auto object-contain object-left md:mt-10 -ml-5"
              priority
            />
          </Link>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400 md:mt-10">Kundportal</span>
        </div>
        <nav aria-label="Portalnavigering">
          <ul className="-mb-px flex justify-center gap-1 overflow-x-auto">
            {LINKS.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <li key={l.href} className="shrink-0">
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`block border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "border-blue-600 text-blue-700"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
