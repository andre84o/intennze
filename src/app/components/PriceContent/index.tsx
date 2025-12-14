"use client";
import Link from "next/link";
import { useLanguage } from "@/app/i18n/LanguageProvider";

export default function PriceContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";

  const T = {
    subtitle: sv ? "Tjänster" : "Services",
    title: sv ? "Allt ni behöver för en framgångsrik webbnärvaro" : "Everything you need for a successful web presence",
    intro: sv
      ? "Från första idé till färdig webbplats och vidare. Vi tar hand om hela processen så att ni kan fokusera på er kärnverksamhet."
      : "From initial idea to finished website and beyond. We handle the entire process so you can focus on your core business.",

    offerings: sv
      ? [
          { icon: "design", title: "Strategi & Design", desc: "Vi analyserar er marknad och målgrupp för att skapa en design som konverterar besökare till kunder." },
          { icon: "code", title: "Utveckling", desc: "Moderna webbplatser byggda med Next.js och React för maximal prestanda och sökmotoroptimering." },
          { icon: "rocket", title: "Lansering", desc: "Vi hanterar hela lanseringsprocessen inklusive domän, hosting och säkerhet." },
          { icon: "support", title: "Löpande support", desc: "Proaktivt underhåll, uppdateringar och support så att er webbplats alltid är i toppform." },
        ]
      : [
          { icon: "design", title: "Strategy & Design", desc: "We analyze your market and audience to create a design that converts visitors into customers." },
          { icon: "code", title: "Development", desc: "Modern websites built with Next.js and React for maximum performance and SEO." },
          { icon: "rocket", title: "Launch", desc: "We handle the entire launch process including domain, hosting and security." },
          { icon: "support", title: "Ongoing support", desc: "Proactive maintenance, updates and support to keep your website in top shape." },
        ],

    processTitle: sv ? "Så här arbetar vi" : "How we work",
    process: sv
      ? [
          { step: "01", title: "Samtal", desc: "Vi börjar med ett kostnadsfritt samtal för att förstå era behov och mål." },
          { step: "02", title: "Förslag", desc: "Ni får ett skräddarsytt förslag baserat på era specifika krav." },
          { step: "03", title: "Utveckling", desc: "Vi bygger er lösning med regelbundna avstämningar under processen." },
          { step: "04", title: "Lansering", desc: "Er webbplats lanseras och vi säkerställer att allt fungerar perfekt." },
        ]
      : [
          { step: "01", title: "Consultation", desc: "We start with a free consultation to understand your needs and goals." },
          { step: "02", title: "Proposal", desc: "You receive a tailored proposal based on your specific requirements." },
          { step: "03", title: "Development", desc: "We build your solution with regular check-ins throughout the process." },
          { step: "04", title: "Launch", desc: "Your website launches and we ensure everything works perfectly." },
        ],

    ctaTitle: sv ? "Redo att komma igång?" : "Ready to get started?",
    ctaText: sv
      ? "Boka ett kostnadsfritt samtal så diskuterar vi hur vi kan hjälpa er att nå era digitala mål."
      : "Book a free consultation and we'll discuss how we can help you achieve your digital goals.",
    ctaBtn: sv ? "Boka samtal" : "Book consultation",
  };

  const iconMap: Record<string, React.ReactNode> = {
    design: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 22s3-1 5-3 3-5 3-5l7-7a3 3 0 1 0-4-4l-7 7s-3 1-5 3-3 5-3 5" /></svg>,
    code: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
    rocket: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /></svg>,
    support: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white overflow-x-hidden">
      {/* Hero */}
      <section className="relative pt-32 md:pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-40 left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-purple-400 font-mono mb-6">
            {T.subtitle}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            {T.title}
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {T.intro}
          </p>
        </div>
      </section>

      {/* Offerings */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {T.offerings.map((item, i) => (
              <div key={i} className="group p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-purple-500/50 transition-all duration-300 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500/20 to-transparent rounded-2xl text-purple-400 mb-4">
                  {iconMap[item.icon]}
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">{T.processTitle}</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {T.process.map((item, i) => (
              <div key={i} className="relative">
                {i < T.process.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-purple-500/50 to-transparent" />
                )}
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {item.step}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
              {T.ctaTitle}
            </span>
          </h2>
          <p className="mt-6 text-slate-400 text-lg max-w-xl mx-auto">{T.ctaText}</p>
          <Link
            href="/kontakt"
            className="mt-10 inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full font-bold text-lg hover:scale-105 transition-transform"
          >
            {T.ctaBtn}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </main>
  );
}
