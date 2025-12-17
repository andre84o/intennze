"use client";
import CookieConsent from "react-cookie-consent";
import Link from "next/link";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";

export default function CookieBanner() {
  const { lang } = useLanguage();
  const t = dict[lang];

  return (
    <CookieConsent
      location="bottom"
      cookieName="intenzze-consent"
      expires={180}
      disableStyles
      overlay={false}
      containerClasses="fixed left-4 right-4 bottom-4 sm:left-6 sm:right-6 sm:bottom-6 z-40 mx-auto max-w-2xl rounded-2xl border border-slate-700/50 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50"
      contentClasses="p-5 sm:p-6"
      buttonWrapperClasses="flex items-center justify-end gap-3 px-5 pb-5 sm:px-6 sm:pb-6"
      buttonText={t.cookie_accept}
      buttonClasses="inline-flex items-center rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
      declineButtonText={t.cookie_decline}
      enableDeclineButton
      declineButtonClasses="inline-flex items-center rounded-full border border-slate-600 bg-slate-800/50 px-6 py-2.5 text-sm font-medium text-slate-300 backdrop-blur transition-all hover:bg-slate-700/50 hover:text-white hover:border-slate-500"
      ariaAcceptLabel={t.cookie_aria_accept}
      ariaDeclineLabel={t.cookie_aria_decline}
    >
      <div className="relative">
        {/* Gradient accent line */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-500 via-purple-500 to-fuchsia-500 rounded-t-2xl -translate-y-5"
          aria-hidden
        />

        {/* Cookie icon */}
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 items-center justify-center border border-slate-700/50">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
              <circle cx="12" cy="12" r="10" />
              <circle cx="8" cy="9" r="1" fill="currentColor" />
              <circle cx="15" cy="8" r="1" fill="currentColor" />
              <circle cx="10" cy="14" r="1" fill="currentColor" />
              <circle cx="16" cy="13" r="1" fill="currentColor" />
              <circle cx="13" cy="17" r="1" fill="currentColor" />
            </svg>
          </div>

          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">{t.cookie_title}</h2>
            <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{t.cookie_body}</p>
            <div className="mt-3 text-xs text-slate-500">
              {t.cookie_more_prefix}{" "}
              <Link
                href="/integritetspolicy"
                className="text-cyan-400 hover:text-cyan-300 transition-colors underline decoration-cyan-400/30 underline-offset-2 hover:decoration-cyan-300"
              >
                {t.cookie_policy_link}
              </Link>
              .
            </div>
          </div>
        </div>
      </div>
    </CookieConsent>
  );
}
