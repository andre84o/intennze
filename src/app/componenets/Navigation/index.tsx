// Fil: app/componenets/Navigation.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

export default function Navigation() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex flex-row space-x-7 font-bold mr-10">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`hover:underline text-shade border-0 ${
              active ? "text-white" : "text-black"
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
