"use client";
import { useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import ContactForm from "../contactForm";

export default function AboutContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";
  const [showContactModal, setShowContactModal] = useState(false);

  const T = {
    title: sv ? "Vi bygger digitala upplevelser som driver tillväxt" : "We build digital experiences that drive growth",
    subtitle: sv ? "Om intenzze" : "About intenzze",
    intro: sv
      ? "intenzze är en digital byrå specialiserad på att skapa högpresterande webbplatser för ambitiösa företag. Vi kombinerar strategisk insikt med teknisk excellens för att leverera lösningar som inte bara ser bra ut – utan som levererar mätbara resultat."
      : "intenzze is a digital agency specialized in creating high-performance websites for ambitious companies. We combine strategic insight with technical excellence to deliver solutions that don't just look good – but deliver measurable results.",

    expertise: sv ? "Vår expertis" : "Our expertise",
    expertiseItems: sv
      ? [
          { title: "Strategi & Rådgivning", desc: "Vi analyserar era behov och marknadsposition för att skapa en digital strategi som stödjer era affärsmål." },
          { title: "Design & UX", desc: "Användarvänliga gränssnitt som guidar besökare mot konvertering genom intuitiv design." },
          { title: "Utveckling", desc: "Skalbara, säkra och blixtsnabba webbplatser byggda med modern teknologi." },
          { title: "Optimering & Support", desc: "Kontinuerlig förbättring baserat på data och användarbeteende." },
        ]
      : [
          { title: "Strategy & Consulting", desc: "We analyze your needs and market position to create a digital strategy that supports your business goals." },
          { title: "Design & UX", desc: "User-friendly interfaces that guide visitors toward conversion through intuitive design." },
          { title: "Development", desc: "Scalable, secure and lightning-fast websites built with modern technology." },
          { title: "Optimization & Support", desc: "Continuous improvement based on data and user behavior." },
        ],

    approach: sv ? "Vårt tillvägagångssätt" : "Our approach",
    approachTitle: sv ? "Struktur före glitter" : "Structure before glitter",
    approachText: sv
      ? "Vi tror på att bygga rätt från grunden. Det innebär att vi prioriterar prestanda, tillgänglighet och teknisk kvalitet innan vi lägger till visuella effekter. Resultatet är webbplatser som inte bara imponerar – utan som faktiskt fungerar och konverterar."
      : "We believe in building right from the foundation. This means we prioritize performance, accessibility and technical quality before adding visual effects. The result is websites that don't just impress – but actually work and convert.",

    stats: sv
      ? [
          { value: "100%", label: "Nöjda kunder" },
          { value: "50+", label: "Projekt levererade" },
          { value: "<1s", label: "Genomsnittlig laddtid" },
        ]
      : [
          { value: "100%", label: "Satisfied clients" },
          { value: "50+", label: "Projects delivered" },
          { value: "<1s", label: "Average load time" },
        ],

    ctaTitle: sv ? "Redo att ta nästa steg?" : "Ready to take the next step?",
    ctaText: sv
      ? "Varje projekt börjar med ett samtal. Berätta om era utmaningar och mål så utforskar vi hur vi kan hjälpa er att nå dem."
      : "Every project starts with a conversation. Tell us about your challenges and goals, and we'll explore how we can help you achieve them.",
    ctaBtn: sv ? "Boka ett samtal" : "Book a call",
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-cyan-400 font-mono mb-6">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                {T.subtitle}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
                  {T.title}
                </span>
              </h1>
              <p className="mt-6 text-lg text-slate-400 leading-relaxed">
                {T.intro}
              </p>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-800">
                <Image src="/aboutpage.jpg" alt="intenzze studio" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 border-y border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            {T.stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {stat.value}
                </div>
                <div className="mt-2 text-slate-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Expertise Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
              {T.expertise}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">{sv ? "Vad vi levererar" : "What we deliver"}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {T.expertiseItems.map((item, i) => (
              <div key={i} className="group p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-cyan-500/50 transition-all duration-300">
                <span className="text-4xl font-bold text-slate-800 group-hover:text-cyan-500/30 transition-colors">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Approach Section */}
      <section className="px-6 bg-slate-900/30">
        <div className="max-w-4xl mx-auto text-center pb-2">
          <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
            {T.approach}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {T.approachTitle}
          </h2>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {T.approachText}
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-fuchsia-500/10 border border-slate-800 p-12 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_70%)]" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold">{T.ctaTitle}</h2>
              <p className="mt-4 text-slate-400 max-w-xl mx-auto">{T.ctaText}</p>
              <button
                onClick={() => setShowContactModal(true)}
                className="mt-8 inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-full font-bold hover:scale-105 transition-transform"
              >
                {T.ctaBtn}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowContactModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors"
              aria-label={sv ? "Stäng" : "Close"}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <ContactForm onSent={() => setShowContactModal(false)} />
          </div>
        </div>
      )}
    </main>
  );
}
