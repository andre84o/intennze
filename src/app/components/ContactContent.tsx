"use client";

import ContactForm from "./contactForm";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";

export default function ContactContent() {
  const { lang } = useLanguage();
  const t = dict[lang];

  return (
    <main className="relative isolate flex-1">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-rose-50 to-white" aria-hidden />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-black sm:text-4xl">
                {t.contact_page_hero_title}
              </h1>
              <p className="mt-3 max-w-prose text-base leading-relaxed text-black/70 sm:text-lg">
                {t.contact_page_hero_body}
              </p>

              <ul className="mt-6 space-y-3 text-black/80">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-rose-100 text-rose-600">✓</span>
                  <span className="text-base">{t.contact_bullet_1}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-600">✓</span>
                  <span className="text-base">{t.contact_bullet_2}</span>
                </li>
              </ul>

              <div className="mt-6 rounded-2xl border border-black/10 bg-white/70 p-4 text-sm text-black/70 shadow-sm backdrop-blur">
                {t.contact_note}
              </div>
            </div>

            <div className="lg:pl-8">
              <div className="rounded-3xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
