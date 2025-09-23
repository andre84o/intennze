"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Hamburger from "hamburger-react";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";

const ANIM_MS = 200; 
const NavigationMobile = () => {
  const [isOpen, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const closeTimer = useRef<number | null>(null);
  const { lang } = useLanguage();
  const isOpenRef = useRef(isOpen);

  const toggle = (val: boolean) => {
    if (val) {
      setMounted(true);
      requestAnimationFrame(() => setOpen(true));
    } else {
      setOpen(false);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => setMounted(false), ANIM_MS);
    }
  };
  const onHamburgerToggle: React.Dispatch<React.SetStateAction<boolean>> = (
    next
  ) => {
    const nextVal = typeof next === "function" ? next(isOpen) : next;
    toggle(nextVal);
  };

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isOpenRef.current) toggle(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && toggle(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = isOpen ? "hidden" : prev || "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const items = [
    { name: dict[lang].nav_home, href: "/" },
    { name: dict[lang].nav_about, href: "/om-oss" },
    { name: dict[lang].nav_prices, href: "/priser" },
    { name: dict[lang].nav_contact, href: "/kontakt" },
  ];

  return (
    <div className="md:hidden">
      <Hamburger
        toggled={isOpen}
        toggle={onHamburgerToggle} 
        label={isOpen ? (lang === "sv" ? "Stäng meny" : "Close menu") : (lang === "sv" ? "Öppna meny" : "Open menu")}
        aria-controls="mobile-menu"
        aria-expanded={isOpen}
      />

      {mounted && (
        <>
          <button
            type="button"
            aria-label={lang === "sv" ? "Stäng meny" : "Close menu"}
            className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => toggle(false)}
          />
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={lang === "sv" ? "Mobilmeny" : "Mobile menu"}
            className={`fixed right-0 top-0 z-50 h-full w-[84%] max-w-sm border-l border-black/10 bg-white/90 backdrop-blur-xl shadow-xl transition-transform duration-200 ease-out ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="pointer-events-none h-1 w-full bg-gradient-to-r from-rose-500 to-fuchsia-500" aria-hidden />

            <nav className="flex h-full flex-col">
              <div className="px-5 py-4">
                <p className="text-sm text-black/60">{lang === "sv" ? "Meny" : "Menu"}</p>
              </div>

              <ul className="flex-1 space-y-1 px-2" role="menu">
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        role="menuitem"
                        className={`block rounded-xl px-4 py-3 text-base transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600 ${
                          active
                            ? "bg-white text-black shadow-sm border border-black/10"
                            : "text-black/80 hover:bg-white/80 hover:text-black"
                        }`}
                      >
                        <span
                          className={`${
                            active
                              ? "bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-transparent font-semibold"
                              : ""
                          }`}
                        >
                          {item.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <div className="px-4 pb-6 pt-2">
                <Link
                  href="/kontakt"
                  className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-rose-600 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:from-rose-500 hover:to-fuchsia-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600"
                >
                  {lang === "sv" ? "Boka möte" : "Book a meeting"}
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
};

export default NavigationMobile;
