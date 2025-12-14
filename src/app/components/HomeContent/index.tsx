"use client";
import { useLanguage } from "@/app/i18n/LanguageProvider";

export default function HomeContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";

  const HERO_TAGLINE = sv ? "Struktur före glitter" : "Structure before glitter";
  const INTRO = sv
    ? "Vi skapar snabba, tillgängliga och vackra webbupplevelser som driver affärsvärde."
    : "We craft fast, accessible and beautiful web experiences that drive business value.";
  const BTN_BOOK = sv ? "Boka möte" : "Book meeting";

  const S1_TITLE = sv ? "Design" : "Design";
  const S1_DESC = sv ? "Från skiss till färdig upplevelse." : "From sketches to finished experiences.";
  const S2_TITLE = sv ? "Utveckling" : "Development";
  const S2_DESC = sv ? "Moderna hemsidor som skalar." : "Modern websites that scale.";
  const S3_TITLE = sv ? "Drift" : "Operations";
  const S3_DESC = sv ? "Säker drift och optimering." : "Secure operations and optimization.";

  return (
    <main className="min-h-screen w-full flex flex-col bg-slate-950 text-white overflow-x-hidden">
      {/* Hero - Asymmetric with floating elements */}
      <section className="relative min-h-screen flex items-center px-6 pt-28">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-500/10 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative max-w-7xl mx-auto w-full">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                <span className="text-cyan-400 text-sm font-mono">intenzze.studio</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-none">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
                  {HERO_TAGLINE}
                </span>
              </h1>
              <p className="mt-8 text-xl text-slate-400 max-w-xl leading-relaxed">
                {INTRO}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a
                  href="/kontakt"
                  className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium overflow-hidden"
                >
                  <span className="relative z-10">{BTN_BOOK}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href="/om-oss"
                  className="px-8 py-4 border border-slate-700 rounded-lg font-medium hover:border-slate-500 hover:bg-slate-800/50 transition-all"
                >
                  {sv ? "Utforska" : "Explore"} →
                </a>
              </div>
            </div>
            <div className="lg:col-span-5 relative mt-8 md:mt-0">
              {/* 3D-like card stack */}
              <div className="relative h-80 lg:h-96">
                <div className="absolute top-0 right-0 w-64 h-40 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 backdrop-blur-xl border border-cyan-500/20 rounded-2xl transform rotate-6 hover:rotate-3 transition-transform" />
                <div className="absolute top-8 right-8 w-64 h-40 bg-gradient-to-br from-purple-500/20 to-purple-500/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl transform -rotate-3 hover:rotate-0 transition-transform" />
                <div className="absolute top-16 right-16 w-64 h-40 bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-500/5 backdrop-blur-xl border border-fuchsia-500/20 rounded-2xl transform rotate-1 hover:-rotate-2 transition-transform">
                  <div className="p-6">
                    <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400">
                      100%
                    </div>
                    <p className="text-sm text-slate-400 mt-2">
                      {sv ? "Nöjda kunder" : "Happy clients"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services - Glassmorphism cards */}
      <section className="relative px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
              {sv ? "Våra tjänster" : "Our services"}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold">
              {sv ? "Vad vi erbjuder" : "What we offer"}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="group p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-cyan-500/50 transition-all duration-300">
              <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-transparent rounded-xl mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
                  <path d="M2 22s3-1 5-3 3-5 3-5l7-7a3 3 0 1 0-4-4l-7 7s-3 1-5 3-3 5-3 5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">{S1_TITLE}</h3>
              <p className="text-slate-400">{S1_DESC}</p>
              <div className="mt-6 h-1 w-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full group-hover:w-full transition-all duration-500" />
            </div>
            <div className="group p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-purple-500/50 transition-all duration-300">
              <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-transparent rounded-xl mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">{S2_TITLE}</h3>
              <p className="text-slate-400">{S2_DESC}</p>
              <div className="mt-6 h-1 w-0 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full group-hover:w-full transition-all duration-500" />
            </div>
            <div className="group p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-fuchsia-500/50 transition-all duration-300">
              <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-fuchsia-500/20 to-transparent rounded-xl mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fuchsia-400">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">{S3_TITLE}</h3>
              <p className="text-slate-400">{S3_DESC}</p>
              <div className="mt-6 h-1 w-0 bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-full group-hover:w-full transition-all duration-500" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
              {sv ? "Redo att transformera din närvaro?" : "Ready to transform your presence?"}
            </span>
          </h2>
          <a
            href="/kontakt"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-slate-950 rounded-full font-bold text-lg hover:scale-105 transition-transform"
          >
            {sv ? "Starta nu" : "Start now"}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>
    </main>
  );
}
