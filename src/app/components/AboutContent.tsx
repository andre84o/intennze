"use client";

import Image from "next/image";
import Link from "next/link";
import GalleryLightbox from "@/app/components/GalleryLightbox";
import { useLanguage } from "@/app/i18n/LanguageProvider";

export default function AboutContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";

  const T = {
    title: sv ? "Om oss" : "About us",
    intro1: sv
      ? "intenzze bygger hemsidor som är snygga, snabba och lätta att använda."
      : "intenzze builds websites that are beautiful, fast and easy to use.",
    intro2: sv
      ? "Vi har många års erfarenhet och har skapat flera lyckade sajter för små och stora företag. Du får en skräddarsydd hemsida som passar din verksamhet och dina mål. Vi lyssnar först och föreslår bara det du verkligen behöver."
      : "We have many years of experience and have created successful sites for small and large companies. You get a tailored website that fits your business and goals. We listen first and only propose what you really need.",
    whyTitle: sv ? "Varför välja oss" : "Why choose us",
    bullets: sv
      ? [
          "• Tydlig plan och tydliga leveranser så du vet vad som händer i varje steg.",
          "• Texter och bilder optimeras så sidan laddar snabbt.",
          "• Designen är enkel och klar så besökare hittar rätt direkt.",
          "• Vi ser till att sidan fungerar på mobil, surfplatta och dator.",
          "• Grundläggande sökmotoroptimering ingår så du syns bättre på Google.",
          "• Vi kan koppla formulär, bokning, betalning och nyhetsbrev när du vill.",
          "• Du får utbildning som gör att du enkelt kan uppdatera själv.",
          "• Support och uppdateringar finns när du behöver oss, så du kan växa tryggt.",
        ]
      : [
          "• A clear plan and deliverables so you know what's happening at every step.",
          "• Copy and images are optimized so the site loads quickly.",
          "• Simple, clear design so visitors find their way instantly.",
          "• We ensure the site works on mobile, tablet and desktop.",
          "• Basic SEO included to improve your presence on Google.",
          "• We can integrate forms, booking, payments and newsletters whenever needed.",
          "• You get training so you can easily update content yourself.",
          "• Support and updates when you need us, so you can grow confidently.",
        ],
    howTitle: sv ? "Vårt arbetssätt" : "How we work",
    howText: sv
      ? "Vi prioriterar struktur före glitter. Det betyder fokus på prestanda, tillgänglighet och tydlighet – och först därefter animationer och effekter. På så sätt får du en webb som både känns modern och levererar resultat."
      : "We prioritize structure before glitter. That means focusing on performance, accessibility and clarity — and only then animations and effects. This gives you a website that feels modern and delivers results.",
    galleryTitle: sv ? "Bilder från vårt arbete" : "Images from our work",
    galleryAlt: sv ? ["Projekt 1", "Projekt 2", "Projekt 3", "Projekt 4"] : ["Project 1", "Project 2", "Project 3", "Project 4"],
    ctaTitle: sv ? "Redo att prata om din webb?" : "Ready to talk about your website?",
    ctaText: sv
      ? "Vi lyssnar först och föreslår bara det du verkligen behöver. Låt oss skapa något snabbt, tydligt och vackert – tillsammans."
      : "We listen first and only propose what you really need. Let's create something fast, clear and beautiful — together.",
    ctaBtn: sv ? "Kontakta oss" : "Contact us",
  } as const;

  const images = [
    { src: "/images/Projekt1.png", alt: T.galleryAlt[0] },
    { src: "/images/prijekt2.png", alt: T.galleryAlt[1] },
    { src: "/images/projekt3.png", alt: T.galleryAlt[2] },
    { src: "/images/projekt4.png", alt: T.galleryAlt[3] },
  ];

  return (
    <main className="min-h-screen w-full">
      <section className="mx-auto max-w-7xl px-6 pt-24 md:pt-28">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">{T.title}</h1>
            <p className="mt-5 text-lg text-black/70 max-w-prose">{T.intro1}</p>
            <p className="mt-3 text-black/70 max-w-prose">{T.intro2}</p>
          </div>
          <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl shadow-sm">
            <Image src="/aboutpage.jpg" alt="intenzze studio" fill className="object-cover" priority />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 mt-14 md:mt-20">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 backdrop-blur shadow-sm">
            <h2 className="text-xl font-semibold">{T.whyTitle}</h2>
            <ul className="mt-4 space-y-3 text-black/80">
              {T.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 backdrop-blur shadow-sm">
            <h2 className="text-xl font-semibold">{T.howTitle}</h2>
            <p className="mt-4 text-black/70">{T.howText}</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 mt-14 md:mt-20">
        <h2 className="text-xl font-semibold">{T.galleryTitle}</h2>
        <p className="mt-1 text-sm text-black/60"></p>
        <div className="mt-6">
          <GalleryLightbox images={images} />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 mt-16 md:mt-24 pb-10">
        <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white/70 backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-100/60 via-white/0 to-fuchsia-100/60" aria-hidden />
          <div className="relative p-8 md:p-12 text-center md:text-left grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold">{T.ctaTitle}</h3>
              <p className="mt-3 text-black/70 max-w-xl">{T.ctaText}</p>
            </div>
            <div className="flex justify-center md:justify-end">
              <Link
                href="/kontakt"
                className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-fuchsia-600 px-6 py-3 text-white text-sm font-medium shadow-sm transition hover:from-rose-500 hover:to-fuchsia-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600"
              >
                {T.ctaBtn}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
