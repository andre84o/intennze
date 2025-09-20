"use client";

import Image from "next/image";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";

export default function HomeContent() {
  const { lang } = useLanguage();
  const t = dict[lang];
  return (
    <main className="min-h-screen w-full flex flex-col">
      <section className="mx-auto max-w-7xl px-6 pt-24 md:pt-32">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="relative w-full aspect-square overflow-hidden rounded-lg md:hidden shadow-sm">
            <h1 className="absolute inset-0 grid place-items-center px-6 text-center text-4xl font-semibold leading-tight">
              <span
                className="inline-block animate-slide-in-left will-change-transform"
                style={{ animationDuration: "900ms" }}
              >
                intenzze{" "}
              </span>
              <span
                className="block animate-fade-in-up will-change-transform font-extrabold bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-transparent"
                style={{ animationDelay: "450ms", animationDuration: "800ms" }}
              >
                {t.home_hero_tagline}
              </span>
            </h1>
          </div>
          <div className="text-center md:text-left">
            <h1 className="hidden md:block text-5xl md:text-6xl font-semibold leading-tight">
              <span
                className="inline-block animate-slide-in-left will-change-transform"
                style={{ animationDuration: "900ms" }}
              >
                intenzze{" "}
              </span>
              <span
                className="inline-block animate-fade-in-up will-change-transform font-extrabold bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-transparent"
                style={{ animationDelay: "450ms", animationDuration: "800ms" }}
              >
                {t.home_hero_tagline}
              </span>
            </h1>
            <p className="mt-6 text-lg text-black/70 max-w-2xl md:max-w-none mx-auto md:mx-0">{t.home_intro}</p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
              <a
                href="/kontakt"
                className="inline-flex items-center rounded-full bg-rose-600 px-5 py-3 text-white text-sm font-medium shadow-sm hover:bg-rose-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                {t.home_cta_book_meeting}
              </a>
              <a
                href="/om-oss"
                className="inline-flex items-center rounded-full border border-black/10 bg-white/70 px-5 py-3 text-sm font-medium backdrop-blur hover:bg-white/90"
              >
                {t.home_cta_read_more}
              </a>
            </div>
          </div>
          <div className="block hidden md:block relative mx-auto w-full max-w-[560px] max-h-[410px] aspect-square overflow-hidden rounded-lg translate-y-1 translate-x-4">
            <Image
              src="/bg-intennze-t.jpg"
              alt="intenzze studio"
              fill
              priority
              className="object-cover"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)," +
                  "linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
                WebkitMaskComposite: "source-in",
                maskImage:
                  "linear-gradient(to right, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)," +
                  "linear-gradient(to bottom, transparent 0, black 28px, black calc(100% - 28px), transparent 100%)",
                maskComposite: "intersect",
              }}
            />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 mt-16 md:mt-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="rounded-xl bg-white/80 border border-black/10 p-6 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2 22s3-1 5-3 3-5 3-5l7-7a3 3 0 1 0-4-4l-7 7s-3 1-5 3-3 5-3 5" />
                </svg>
              </span>
              <h3 className="text-xl font-semibold">{t.home_service_design}</h3>
            </div>
            <p className="mt-4 text-black/70">{t.home_service_design_desc}</p>
          </div>
          <div className="rounded-xl bg-white/80 border border-black/10 p-6 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-fuchsia-50 text-fuchsia-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </span>
              <h3 className="text-xl font-semibold">{t.home_service_dev}</h3>
            </div>
            <p className="mt-4 text-black/70">{t.home_service_dev_desc}</p>
          </div>
          <div className="rounded-xl bg-white/80 border border-black/10 p-6 backdrop-blur shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="inline-grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <h3 className="text-xl font-semibold">{t.home_service_ops}</h3>
            </div>
            <p className="mt-4 text-black/70">{t.home_service_ops_desc}</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 mt-11 md:mt-24 pb-10">
        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-100/60 via-white/0 to-fuchsia-100/60" aria-hidden />
          <div className="relative p-8 md:p-12 text-center md:text-left grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-semibold">{t.cta_title}</h2>
              <p className="mt-3 text-black/70 max-w-xl">{t.cta_body}</p>
            </div>
            <div className="flex justify-center md:justify-end">
              <a
                href="/kontakt"
                className="inline-flex items-center rounded-full bg-fuchsia-600 px-6 py-3 text-white text-sm font-medium shadow-sm hover:bg-fuchsia-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600"
              >
                {t.cta_button}
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
