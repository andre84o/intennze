"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Lang } from "@/app/i18n/dict";

type Ctx = { lang: Lang; setLang: (l: Lang) => void };
const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("sv");

  useEffect(() => {
    try {
      // Prefer cookie so server and client stay in sync
      const cookieMatch = document.cookie.match(/(?:^|; )lang=(sv|en)(?:;|$)/);
      const fromCookie = cookieMatch?.[1];
      const saved = localStorage.getItem("lang");
      const initial = (fromCookie === "sv" || fromCookie === "en") ? fromCookie : (saved === "sv" || saved === "en" ? saved : null);
      if (initial) setLang(initial as Lang);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", lang);
      // Set cookie accessible to server
      const maxAge = 60 * 60 * 24 * 365; // 1 year
      document.cookie = `lang=${lang}; path=/; max-age=${maxAge}`;
    }
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
