"use client";
import { useState } from "react";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import ContactForm from "../contactForm";

export default function HomeContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";
  const [showContactModal, setShowContactModal] = useState(false);

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

  // Demo examples
  const DEMO_SECTION_TAG = sv ? "Exempel" : "Examples";
  const DEMO_SECTION_TITLE = sv ? "Exempel på sidor" : "Example sites";
  const DEMO_SECTION_DESC = sv
    ? "Utforska våra demo-sidor och se vad vi kan göra för dig."
    : "Explore our demo sites and see what we can do for you.";

  const demos = [
    {
      url: "https://demo-bygg.vercel.app/",
      title: sv ? "Byggföretag" : "Construction",
      desc: sv ? "Modern sida för byggbranschen" : "Modern site for construction industry",
      gradient: "from-cyan-500/50 to-cyan-500/20",
      border: "hover:border-cyan-500/50"
    },
    {
      url: "https://demo-barber-seven.vercel.app/",
      title: sv ? "Frisör" : "Barber",
      desc: sv ? "Stilren design för salong" : "Sleek design for salons",
      gradient: "from-purple-500/50 to-purple-500/20",
      border: "hover:border-purple-500/50"
    },
    {
      url: "https://demo-redovisning.vercel.app/",
      title: sv ? "Redovisning" : "Accounting",
      desc: sv ? "Professionell och trovärdig" : "Professional and trustworthy",
      gradient: "from-fuchsia-500/50 to-fuchsia-500/20",
      border: "hover:border-fuchsia-500/50"
    },
    {
      url: "https://demo-restaurang.vercel.app/",
      title: sv ? "Restaurang" : "Restaurant",
      desc: sv ? "Aptitretande webbupplevelse" : "Appetizing web experience",
      gradient: "from-amber-500/50 to-amber-500/20",
      border: "hover:border-amber-500/50"
    }
  ];

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
                  <span className="relative">{BTN_BOOK}</span>
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
              {/* Modern code terminal */}
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-3xl blur-2xl opacity-60" />

                {/* Terminal window */}
                <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
                  {/* Terminal header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="ml-2 text-xs text-slate-500 font-mono">intenzze.webbstudio</span>
                  </div>

                  {/* Terminal content */}
                  <div className="p-5 font-mono text-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400">$</span>
                      <span className="text-slate-300">npx create-next-app</span>
                      <span className="w-2 h-4 bg-cyan-400 animate-pulse" />
                    </div>
                    <div className="text-slate-500 text-xs">
                      {sv ? "Skapar din webbplats..." : "Creating your website..."}
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-400 text-xs">{sv ? "Responsiv design" : "Responsive design"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-400 text-xs">{sv ? "Blixtsnabb laddning" : "Lightning fast"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-400 text-xs">{sv ? "Säker & krypterad" : "Secure & encrypted"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-400 text-xs">{sv ? "Modern teknologi" : "Modern technology"}</span>
                      </div>
                    </div>
                    <div className="pt-3 flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-green-400 text-xs">{sv ? "Redo för lansering!" : "Ready to launch!"}</span>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-3 -right-3 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full text-xs font-medium shadow-lg shadow-cyan-500/25">
                  Next.js
                </div>
                <div className="absolute -bottom-3 -left-3 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full text-xs font-medium shadow-lg shadow-purple-500/25">
                  React
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

      {/* Demo Examples */}
      <section className="relative py-24 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header - Centered */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
              {DEMO_SECTION_TAG}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold">
              {DEMO_SECTION_TITLE}
            </h2>
          </div>

          {/* Grid - 4 columns centered */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {demos.map((demo, i) => (
              <a
                key={i}
                href={demo.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden transition-all duration-500 ${demo.border} hover:scale-[1.02]`}
              >
                {/* Screenshot - Wide rectangle */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-t ${demo.gradient} opacity-0 group-hover:opacity-60 transition-opacity duration-500 z-10`} />
                  <img
                    src={`https://api.microlink.io/?url=${encodeURIComponent(demo.url)}&screenshot=true&meta=false&embed=screenshot.url`}
                    alt={demo.title}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Hover overlay with link icon */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20">
                    <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-1">{demo.title}</h3>
                      <p className="text-sm text-slate-400">{demo.desc}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-gradient-to-r group-hover:from-cyan-500 group-hover:to-purple-500 transition-all duration-500">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 group-hover:text-white transition-colors -rotate-45 group-hover:rotate-0 duration-500">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </a>
            ))}
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
          <button
            onClick={() => setShowContactModal(true)}
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-slate-950 rounded-full font-bold text-lg hover:scale-105 transition-transform"
          >
            {sv ? "Starta nu" : "Start now"}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
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
