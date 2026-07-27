"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

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
  { href: "/portal/domains/orders", label: "Beställningar" },
];

function initialsOf(name: string, email: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email || "?").slice(0, 2).toUpperCase();
}

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

export default function PortalNav({ userName, userEmail }: { userName: string; userEmail: string }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-transparent pt-6 md:pt-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-9 items-center justify-between">
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
          <div className="flex items-center gap-3 md:mt-10">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-bold text-slate-900">{userName}</p>
              <p className="text-[11px] font-medium text-slate-400">{userEmail}</p>
            </div>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-bold text-white"
              style={{
                background: "linear-gradient(135deg,#60a5fa,#2563eb)",
                boxShadow: "0 10px 20px -8px rgba(37,99,235,0.5)",
              }}
            >
              {initialsOf(userName, userEmail)}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logga ut"
              title="Logga ut"
              className="inline-flex cursor-pointer items-center rounded-lg p-1.5 text-slate-600 transition-colors hover:text-red-600"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <nav aria-label="Portalnavigering" className="hidden md:block">
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
