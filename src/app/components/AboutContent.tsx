"use client";

import Image from "next/image";
import Link from "next/link";
import GalleryLightbox from "@/app/components/GalleryLightbox";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";

export default function AboutContent() {
  const { lang } = useLanguage();
  const t = dict[lang];
  const bilder = [
    { src: "/images/Projekt1.png", alt: t.about_gallery_alt_1 },
    { src: "/images/prijekt2.png", alt: t.about_gallery_alt_2 },
    { src: "/images/projekt3.png", alt: t.about_gallery_alt_3 },
    { src: "/images/projekt4.png", alt: t.about_gallery_alt_4 },
  ];

  return (
    <main className="min-h-screen w-full">
      <section className="mx-auto max-w-7xl px-6 pt-24 md:pt-28">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">{t.about_title}</h1>
            <p className="mt-5 text-lg text-black/70 max-w-prose">{t.about_intro_1}</p>
            <p className="mt-3 text-black/70 max-w-prose">{t.about_intro_2}</p>
          </div>
          <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl shadow-sm">
            <Image src="/aboutpage.jpg" alt="intenzze studio" fill className="object-cover" priority />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 mt-14 md:mt-20">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 backdrop-blur shadow-sm">
            <h2 className="text-xl font-semibold">{t.about_why_title}</h2>
            <ul className="mt-4 space-y-3 text-black/80">
              <li>{t.about_why_b1}</li>
              <li>{t.about_why_b2}</li>
              <li>{t.about_why_b3}</li>
              <li>{t.about_why_b4}</li>
              <li>{t.about_why_b5}</li>
              <li>{t.about_why_b6}</li>
              <li>{t.about_why_b7}</li>
              <li>{t.about_why_b8}</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 backdrop-blur shadow-sm">
            <h2 className="text-xl font-semibold">{t.about_how_title}</h2>
            <p className="mt-4 text-black/70">{t.about_how_text}</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 mt-14 md:mt-20">
        <h2 className="text-xl font-semibold">{t.about_gallery_title}</h2>
        <p className="mt-1 text-sm text-black/60"></p>
        <div className="mt-6">
          <GalleryLightbox images={bilder} />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 mt-16 md:mt-24 pb-10">
        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-100/60 via-white/0 to-fuchsia-100/60" aria-hidden />
          <div className="relative p-8 md:p-12 text-center md:text-left grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold">{t.about_cta_title}</h3>
              <p className="mt-3 text-black/70 max-w-xl">{t.about_cta_text}</p>
            </div>
            <div className="flex justify-center md:justify-end">
              <Link
                href="/kontakt"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-fuchsia-600 px-6 py-3 text-white text-sm font-medium shadow-sm transition hover:from-rose-500 hover:to-fuchsia-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600"
              >
                {t.about_cta_button}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
