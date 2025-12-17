"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Hamburger from "hamburger-react";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";

const ANIM_MS = 300;

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
    {
      name: dict[lang].nav_home,
      href: "/",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      name: dict[lang].nav_about,
      href: "/om-oss",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      name: dict[lang].nav_services,
      href: "/tjanster",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      )
    },
    {
      name: dict[lang].nav_contact,
      href: "/kontakt",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      )
    },
  ];

  return (
    <div>
      <Hamburger
        toggled={isOpen}
        toggle={onHamburgerToggle}
        label={isOpen ? (lang === "sv" ? "Stäng meny" : "Close menu") : (lang === "sv" ? "Öppna meny" : "Open menu")}
        aria-controls="mobile-menu"
        aria-expanded={isOpen}
        color="#22d3ee"
      />

      {mounted && createPortal(
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label={lang === "sv" ? "Stäng meny" : "Close menu"}
            className={`fixed inset-0 z-[9998] bg-black transition-opacity duration-300 ${
              isOpen ? "opacity-95" : "opacity-0"
            }`}
            onClick={() => toggle(false)}
          />

          {/* Menu panel */}
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={lang === "sv" ? "Mobilmeny" : "Mobile menu"}
            className={`fixed right-0 top-0 z-[9999] h-full w-[85%] max-w-sm transition-transform duration-300 ease-out ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Solid panel */}
            <div className="relative h-full bg-slate-950 border-l border-cyan-500/30 shadow-2xl overflow-hidden">
              {/* Gradient accent line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-fuchsia-500" />

              <nav className="relative flex h-full flex-col text-white">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                    <span className="text-sm font-mono text-cyan-400">
                      {lang === "sv" ? "Meny" : "Menu"}
                    </span>
                  </div>
                  <button
                    onClick={() => toggle(false)}
                    className="p-2 rounded-lg text-white hover:bg-slate-800 transition-colors"
                    aria-label={lang === "sv" ? "Stäng" : "Close"}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Navigation links */}
                <ul className="flex-1 space-y-3 px-4 py-6" role="menu">
                  {items.map((item, index) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          role="menuitem"
                          className={`flex items-center gap-4 rounded-xl px-4 py-4 text-lg font-medium transition-all duration-200 ${
                            active
                              ? "bg-cyan-500/20 border border-cyan-500/50 text-white"
                              : "text-white hover:bg-slate-800 border border-transparent"
                          }`}
                        >
                          <span
                            className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                              active
                                ? "bg-gradient-to-br from-cyan-500 to-purple-500 text-white"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="text-white">{item.name}</span>
                          {active && (
                            <svg className="ml-auto w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {/* CTA button */}
                <div className="px-4 pb-8 pt-4">
                  <Link
                    href="/kontakt"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-4 text-lg font-bold text-white shadow-lg"
                  >
                    {lang === "sv" ? "Boka möte" : "Book a meeting"}
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default NavigationMobile;
