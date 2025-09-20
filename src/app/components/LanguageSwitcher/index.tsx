"use client";
import ReactCountryFlag from "react-country-flag";
import { useLanguage } from "@/app/i18n/LanguageProvider";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  const btn =
    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLang("sv")}
        aria-pressed={lang === "sv"}
        className={`${btn} ${
          lang === "sv"
            ? "bg-white text-black shadow-sm border border-black/10"
            : "text-black/80 hover:bg-white/80 hover:text-black"
        }`}
        aria-label="Byt språk till svenska"
        title="Svenska"
      >
        <ReactCountryFlag svg countryCode="SE" style={{ width: "1.1em", height: "1.1em" }} />
        <span>SV</span>
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`${btn} ${
          lang === "en"
            ? "bg-white text-black shadow-sm border border-black/10"
            : "text-black/80 hover:bg-white/80 hover:text-black"
        }`}
        aria-label="Switch language to English"
        title="English"
      >
        <ReactCountryFlag svg countryCode="GB" style={{ width: "1.1em", height: "1.1em" }} />
        <span>EN</span>
      </button>
    </div>
  );
}
