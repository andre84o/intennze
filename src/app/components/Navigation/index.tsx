"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";

export default function Navigation() {
  const pathname = usePathname();
  const { lang } = useLanguage();

  const items = [
    { name: dict[lang].nav_home, href: "/" },
    { name: dict[lang].nav_about, href: "/om-oss" },
    { name: dict[lang].nav_contact, href: "/kontakt" },
  ];

  return (
    <nav className="hidden md:flex items-center gap-2 mr-2">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600 ${
              active
                ? "bg-white text-black shadow-sm border border-black/10"
                : "text-black/80 hover:bg-white/80 hover:text-black"
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
