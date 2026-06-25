"use client";
import { useState } from "react";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import ContactForm from "../contactForm";
import { trackContact } from "@/utils/metaPixel";
import { useEngagementTracking } from "@/lib/useEngagementTracking";

export default function HomeContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";
  const [showContactModal, setShowContactModal] = useState(false);
  // Prefilled message for the contact form (e.g. when opened from a pricing card).
  const [contactIntro, setContactIntro] = useState<string | undefined>(undefined);

  // Scroll depth, dwell time and nav clicks → Meta Pixel + GA4 + GTM. Lets us
  // see whether traffic-ad visitors actually engage with the home page or
  // bounce. PII-free (page name, scroll %, dwell seconds, clicked href only).
  useEngagementTracking("Home");

  // Contact-intent signal (replaces the old "boka möte" Event Setup Tool rule).
  // The Lead still fires on actual form submit inside ContactForm.
  const fireContact = () => trackContact();
  // `intro` is ignored when not a string so existing `onClick={openContactModal}`
  // handlers (which receive the click event) keep working unchanged.
  const openContactModal = (intro?: string) => {
    fireContact();
    setContactIntro(typeof intro === "string" ? intro : undefined);
    setShowContactModal(true);
  };

  // Demo examples
  const DEMO_SECTION_TAG = sv ? "Exempel" : "Examples";
  const DEMO_SECTION_TITLE = sv ? "Exempel på sidor" : "Example sites";
  const DEMO_SECTION_DESC = sv
    ? "Utforska våra demo-sidor och se vad vi kan göra för dig."
    : "Explore our demo sites and see what we can do for you.";

  const demos = [
    {
      url: "https://demo-bygg.vercel.app/",
      screenshotUrl: "https://demo-bygg.vercel.app/",
      title: sv ? "Byggföretag" : "Construction",
      desc: sv ? "Modern sida för byggbranschen" : "Modern site for construction industry",
      gradient: "from-cyan-500/50 to-cyan-500/20",
      border: "hover:border-cyan-500/50",
      hideOnMobile: true
    },
    {
      url: "https://demo-barber-seven.vercel.app/",
      screenshotUrl: "https://demo-barber-seven.vercel.app/",
      title: sv ? "Barber" : "Barber",
      desc: sv ? "Stilren design för salong" : "Sleek design for salons",
      gradient: "from-purple-500/50 to-purple-500/20",
      border: "hover:border-purple-500/50",
      tag: sv ? "Landningssida (One-page)" : "Landing page (One-page)"
    },
    {
      url: "https://demo-redovisning.vercel.app/",
      screenshotUrl: "https://demo-redovisning.vercel.app/",
      title: sv ? "Redovisning" : "Accounting",
      desc: sv ? "Professionell och trovärdig" : "Professional and trustworthy",
      gradient: "from-fuchsia-500/50 to-fuchsia-500/20",
      border: "hover:border-fuchsia-500/50",
      hideOnMobile: true
    },
    {
      url: "https://demo-restaurang.vercel.app/",
      screenshotUrl: "https://demo-restaurang.vercel.app/",
      title: sv ? "Restaurang" : "Restaurant",
      desc: sv ? "Aptitretande webbupplevelse" : "Appetizing web experience",
      gradient: "from-amber-500/50 to-amber-500/20",
      border: "hover:border-amber-500/50",
      hideOnMobile: true
    },
    {
      url: "https://demo-health-red.vercel.app/",
      screenshotUrl: "https://demo-health-red.vercel.app/",
      title: sv ? "Hälsa" : "Health",
      desc: sv ? "Fräsch design för hälsobranschen" : "Fresh design for health industry",
      gradient: "from-emerald-500/50 to-emerald-500/20",
      border: "hover:border-emerald-500/50",
      tag: sv ? "Upp till 5 sidor" : "Up to 5 pages"
    },
    {
      url: "https://clinic-two-omega.vercel.app/",
      screenshotUrl: "https://clinic-two-omega.vercel.app/",
      title: sv ? "Klinik" : "Clinic",
      desc: sv ? "Modern design för vårdmottagning" : "Modern design for healthcare",
      gradient: "from-rose-500/50 to-rose-500/20",
      border: "hover:border-rose-500/50",
      tag: sv ? "Landningssida (One-page)" : "Landing page (One-page)"
    },
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
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                <span className="text-cyan-400 text-sm font-mono">intenzze.studio</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
                <span className="block text-white">
                  {sv ? "Din nya hemsida." : "Your new website."}
                </span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
                  {sv ? "Enkelt. Tryggt. Färdigt." : "Simple. Secure. Done."}
                </span>
              </h1>
              <p className="mt-6 text-xl sm:text-2xl text-slate-300 max-w-xl leading-relaxed">
                {sv
                  ? "Vi tar hand om allt – du fokuserar på ditt företag."
                  : "We take care of everything – you focus on your business."}
              </p>

              <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                {(sv
                  ? ["Du behöver inte kunna teknik", "Vi hjälper dig hela vägen", "Från idé till lansering"]
                  : ["No tech skills needed", "We help you all the way", "From idea to launch"]
                ).map((point, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-cyan-400">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap gap-4">
                <button
                  onClick={() => openContactModal()}
                  className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium overflow-hidden"
                >
                  <span className="relative">{sv ? "Kom igång" : "Get started"}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <a
                  href="#priser"
                  className="px-8 py-4 border border-slate-700 rounded-lg font-medium hover:border-slate-500 hover:bg-slate-800/50 transition-all"
                >
                  {sv ? "Se priser" : "See pricing"} →
                </a>
              </div>

              {/* Compact value points in a row under the buttons */}
              <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-6">
                {[
                  {
                    title: sv ? "Personlig hjälp" : "Personal help",
                    desc: sv ? "Snabb kommunikation och personlig support." : "Fast communication and personal support.",
                    iconBg: "from-cyan-500/20",
                    iconColor: "text-cyan-400",
                    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
                  },
                  {
                    title: sv ? "Allt på ett ställe" : "Everything in one place",
                    desc: sv ? "Design, innehåll, publicering och support." : "Design, content, publishing and support.",
                    iconBg: "from-purple-500/20",
                    iconColor: "text-purple-400",
                    icon: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
                  },
                  {
                    title: sv ? "Trygg & säker" : "Safe & secure",
                    desc: sv ? "Säker drift, backup och uppdateringar." : "Secure hosting, backup and updates.",
                    iconBg: "from-emerald-500/20",
                    iconColor: "text-emerald-400",
                    icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
                  },
                  {
                    title: sv ? "Byggd för resultat" : "Built for results",
                    desc: sv ? "Snabb, mobilanpassad och SEO-optimerad." : "Fast, mobile-friendly and SEO-optimized.",
                    iconBg: "from-fuchsia-500/20",
                    iconColor: "text-fuchsia-400",
                    icon: <><polyline points="23 6 13.5 16.5 8.5 11.5 1 19" /><polyline points="17 6 23 6 23 12" /></>,
                  },
                ].map((card, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-9 h-9 shrink-0 flex items-center justify-center bg-gradient-to-br ${card.iconBg} to-transparent rounded-full`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={card.iconColor}>
                        {card.icon}
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{card.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 relative mt-8 lg:mt-0">
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

              {/* Description under the terminal — styled as a quote */}
              <blockquote className="relative mt-20 lg:mt-28 pt-2">
                <span className="absolute -top-4 -left-1 text-5xl leading-none text-cyan-500/30 font-serif select-none">“</span>
                <p className="text-base italic text-slate-300 leading-relaxed">
                  {sv
                    ? "Vi bygger moderna, snabba och professionella hemsidor som hjälper dig att synas, få fler kunder och växa."
                    : "We build modern, fast and professional websites that help you get noticed, win more customers and grow."}
                </p>
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - numbered process steps */}
      <section className="relative px-6 mt-16 md:mt-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
              {sv ? "Så fungerar det" : "How it works"}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold">
              {sv ? "Från idé till färdig webbplats" : "From idea to finished website"}
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: sv ? "Vi lär känna ditt företag" : "We get to know your business",
                desc: sv
                  ? "Vi går igenom dina mål och vad du vill uppnå."
                  : "We go through your goals and what you want to achieve.",
                iconWrap: "from-cyan-500/20 ring-cyan-500/30",
                iconColor: "text-cyan-400",
                label: "text-cyan-400",
                border: "hover:border-cyan-500/50",
                bar: "from-cyan-500 to-purple-500",
                icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
              },
              {
                title: sv ? "Vi bygger din webbplats" : "We build your website",
                desc: sv
                  ? "Vi skapar design, innehåll och funktioner anpassade efter ditt företag."
                  : "We create design, content and features tailored to your business.",
                iconWrap: "from-purple-500/20 ring-purple-500/30",
                iconColor: "text-purple-400",
                label: "text-purple-400",
                border: "hover:border-purple-500/50",
                bar: "from-purple-500 to-fuchsia-500",
                icon: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
              },
              {
                title: sv ? "Vi lanserar och tar hand om resten" : "We launch and handle the rest",
                desc: sv
                  ? "Vi lanserar din webbplats och tar hand om den tekniska biten så att du kan fokusera på ditt företag."
                  : "We launch your website and handle the technical side so you can focus on your business.",
                iconWrap: "from-fuchsia-500/20 ring-fuchsia-500/30",
                iconColor: "text-fuchsia-400",
                label: "text-fuchsia-400",
                border: "hover:border-fuchsia-500/50",
                bar: "from-fuchsia-500 to-cyan-500",
                icon: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></>,
              },
            ].map((step, i) => (
              <div
                key={i}
                className={`group relative overflow-hidden p-8 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl transition-all duration-300 ${step.border}`}
              >
                {/* Large faint step number watermark */}
                <span className="absolute -top-5 -right-1 text-8xl font-black text-slate-800/50 select-none pointer-events-none">
                  {i + 1}
                </span>
                <div className="relative">
                  <div className={`w-14 h-14 flex items-center justify-center bg-gradient-to-br ${step.iconWrap} to-transparent rounded-full ring-1 mb-6`}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={step.iconColor}>
                      {step.icon}
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-slate-400">{step.desc}</p>
                  <div className={`mt-6 h-1 w-0 bg-gradient-to-r ${step.bar} rounded-full group-hover:w-full transition-all duration-500`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Examples */}
      <section className="relative pt-2 pb-12 md:pt-24 md:pb-12 px-6">
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

          {/* Grid - Flex for better centering of 5 items */}
          <div className="flex flex-wrap justify-center gap-6">
            {demos.map((demo, i) => (
              <a
                key={i}
                href={demo.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-3xl overflow-hidden transition-all duration-500 ${demo.border} ${(demo as { hideOnMobile?: boolean }).hideOnMobile ? "hidden sm:block" : ""} hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1`}
              >
                {/* Screenshot */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-t ${demo.gradient} opacity-20 group-hover:opacity-40 transition-opacity duration-500 z-10`} />
                  <img
                    src={`https://api.microlink.io/?url=${encodeURIComponent((demo as any).screenshotUrl ?? demo.url)}&screenshot=true&meta=false&embed=screenshot.url`}
                    alt={demo.title}
                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Modern overlay button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 bg-slate-950/30 backdrop-blur-[2px]">
                    <div className="px-6 py-3 bg-white text-slate-950 rounded-full font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2 shadow-xl">
                      {sv ? "Besök sida" : "Visit site"}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 relative">
                  {/* Gradient line top */}
                  <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${demo.gradient} opacity-20`} />
                  
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-slate-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                          {demo.title}
                        </h3>
                        {(demo as { tag?: string }).tag && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/70 border border-slate-700 text-slate-400 whitespace-nowrap">
                            {(demo as { tag?: string }).tag}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{demo.desc}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-slate-700/50 group-hover:border-slate-600 transition-colors`}>
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 group-hover:text-white transition-colors">
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

      {/* Pricing */}
      <section id="priser" className="relative pt-2 pb-24 md:pt-4 md:pb-24 px-6 scroll-mt-24">
        <div className="max-w-7xl mx-auto">
          {/* Header - Centered */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
              {sv ? "Priser" : "Pricing"}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold">
              {sv ? "Välj paket som passar dig" : "Choose the package that fits you"}
            </h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">
              {sv
                ? "Exempelpriser – kontakta oss för en offert anpassad efter dina behov."
                : "Example prices – contact us for a quote tailored to your needs."}
            </p>
          </div>

          {/* Pricing grid */}
          <div className="flex flex-wrap justify-center gap-6">
            {[
              {
                name: sv ? "Start" : "Start",
                price: "5 000",
                priceFrom: false,
                tagline: sv ? "Perfekt för en enkel närvaro" : "Perfect for a simple presence",
                gradient: "from-cyan-500/50 to-cyan-500/20",
                border: "hover:border-cyan-500/50",
                popular: false,
                features: sv
                  ? ["Landningssida (one-page)", "Responsiv design", "Kontaktformulär", "Teknisk SEO", "Google Maps", "Koppling till sociala medier", "Driftsättning", "14 dagars support"]
                  : ["Landing page (one-page)", "Responsive design", "Contact form", "Technical SEO", "Google Maps", "Social media links", "Deployment", "14 days of support"],
              },
              {
                name: sv ? "Standard" : "Standard",
                price: "10 000",
                priceFrom: false,
                tagline: sv ? "För växande företag" : "For growing businesses",
                gradient: "from-purple-500/50 to-purple-500/20",
                border: "hover:border-purple-500/50",
                popular: true,
                features: sv
                  ? ["Upp till 5 sidor", "Anpassad design", "Redigera texter och bilder själv", "Förhandsgranska innan publicering", "Teknisk SEO", "Google Maps & företagsprofil", "Bildoptimering", "30 dagars support"]
                  : ["Up to 5 pages", "Custom design", "Edit texts and images yourself", "Preview before publishing", "Technical SEO", "Google Maps & business profile", "Image optimization", "30 days of support"],
              },
              {
                name: sv ? "Premium" : "Premium",
                price: "25 000",
                priceFrom: true,
                tagline: sv ? "Skräddarsydd lösning" : "Tailored solution",
                gradient: "from-fuchsia-500/50 to-fuchsia-500/20",
                border: "hover:border-fuchsia-500/50",
                popular: false,
                features: sv
                  ? ["Upp till 15 sidor", "Bokningssystem eller kundportal", "Redigera texter och bilder själv", "Förhandsgranska innan publicering", "Stripe-betalningar", "Integration mot externa tjänster", "Teknisk SEO", "Flerspråkig webbplats", "60 dagars support"]
                  : ["Up to 15 pages", "Booking system or customer portal", "Edit texts and images yourself", "Preview before publishing", "Stripe payments", "Integration with external services", "Technical SEO", "Multilingual website", "60 days of support"],
              },
            ].map((plan, i) => (
              <div
                key={i}
                className={`group relative flex flex-col w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] bg-slate-900/40 backdrop-blur-md border rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 ${plan.border} ${
                  plan.popular ? "border-purple-500/50" : "border-slate-800/50"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500 to-purple-500 text-white">
                    {sv ? "Populärast" : "Most popular"}
                  </span>
                )}

                {/* Gradient line top */}
                <div className={`absolute top-0 left-8 right-8 h-px bg-gradient-to-r ${plan.gradient} opacity-30`} />

                <h3 className="text-xl font-bold text-slate-100">{plan.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{plan.tagline}</p>

                <div className="mt-6 mb-8">
                  <div className="flex items-baseline gap-1">
                    {plan.priceFrom && <span className="text-lg text-slate-400">{sv ? "Från" : "From"}</span>}
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    <span className="text-lg text-slate-400">kr</span>
                  </div>
                  <span className="text-xs text-slate-500">{sv ? "exkl. moms" : "excl. VAT"}</span>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <span className="text-slate-400">+</span>
                    <span className="font-semibold text-cyan-300">299 kr/mån</span>
                    <span className="text-slate-400">{sv ? "Drift & support" : "Operations & support"}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-3 text-sm text-slate-300">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 shrink-0 text-cyan-400">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span>
                        {feature}
                        {(feature === "Upp till 5 sidor" || feature === "Up to 5 pages") && (
                          <span className="mt-1 block text-xs text-slate-500 leading-relaxed">
                            {sv
                              ? "Exempel: Startsida, Om oss, Tjänster, Priser, Kontakt"
                              : "Example: Home, About, Services, Pricing, Contact"}
                          </span>
                        )}
                        {(feature === "Landningssida (one-page)" || feature === "Landing page (one-page)") && (
                          <span className="mt-1 block text-xs text-slate-500 leading-relaxed">
                            {sv
                              ? "Exempel: Allt innehåll visas på startsidan."
                              : "Example: All content is shown on the homepage."}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() =>
                    openContactModal(
                      sv
                        ? `Hej! Jag är intresserad av paketet "${plan.name}" (${plan.price} kr exkl. moms + 299 kr/mån Drift & support). Berätta gärna mer.`
                        : `Hi! I'm interested in the "${plan.name}" package (${plan.price} kr excl. VAT + 299 kr/mo Operations & support). Please tell me more.`
                    )
                  }
                  className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90"
                      : "border border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800/50"
                  }`}
                >
                  {sv ? "Kom igång" : "Get started"}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>

              </div>
            ))}
          </div>

          {/* Drift & support - monthly subscription */}
          <div className="mt-6 flex justify-center">
            <div className="group relative w-full lg:w-[calc(66.666%-0.5rem)] bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 hover:border-cyan-500/50">
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-cyan-500/50 to-cyan-500/20 opacity-30" />

              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="md:max-w-xs">
                  <h3 className="text-xl font-bold text-slate-100">
                    {sv ? "Drift & support" : "Operations & support"}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {sv ? "Löpande månadsavgift" : "Recurring monthly fee"}
                  </p>

                  <div className="mt-6 mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">299</span>
                      <span className="text-lg text-slate-400">{sv ? "kr/mån" : "kr/mo"}</span>
                    </div>
                    <span className="text-xs text-slate-500">{sv ? "exkl. moms" : "excl. VAT"}</span>
                  </div>

                  <button
                    onClick={() =>
                      openContactModal(
                        sv
                          ? `Hej! Jag är intresserad av "Drift & support" (299 kr/mån exkl. moms). Berätta gärna mer.`
                          : `Hi! I'm interested in "Operations & support" (299 kr/mo excl. VAT). Please tell me more.`
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all border border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800/50"
                  >
                    {sv ? "Kom igång" : "Get started"}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <ul className="grid sm:grid-cols-2 gap-3 flex-1">
                  {(sv
                    ? ["Hemsidan hålls online dygnet runt", "Säkerhetsuppdateringar", "Automatisk backup", "SSL-certifikat ingår", "Teknisk support vid problem", "Hjälp med domänkoppling"]
                    : ["Website kept online around the clock", "Security updates", "Automatic backup", "SSL certificate included", "Technical support when issues arise", "Help with domain connection"]
                  ).map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-3 text-sm text-slate-300">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 shrink-0 text-cyan-400">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tillägg - add-ons */}
          <div className="mt-12 flex justify-center">
            <div className="group relative w-full lg:w-[calc(66.666%-0.5rem)] bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-3xl p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 hover:border-cyan-500/50">
              <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-cyan-500/50 to-cyan-500/20 opacity-30" />

              <div className="mb-8">
                <span className="inline-block px-4 py-1.5 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono">
                  {sv ? "Tillägg" : "Add-ons"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-8 sm:divide-x sm:divide-slate-800/50">
                {[
                  {
                    name: sv ? "Företagsmail" : "Business email",
                    price: "990",
                    features: sv
                      ? ["Installation av företagsmail", "Koppling till domän", "Upp till 3 e-postadresser"]
                      : ["Business email setup", "Domain connection", "Up to 3 email addresses"],
                  },
                  {
                    name: sv ? "Flytt av befintlig e-post" : "Migration of existing email",
                    price: "1 490",
                    features: sv
                      ? ["Flytt från tidigare leverantör", "Konfiguration av nya konton"]
                      : ["Migration from previous provider", "Configuration of new accounts"],
                  },
                ].map((addon, i) => (
                  <div key={i} className={i === 1 ? "sm:pl-8" : ""}>
                    <h3 className="text-lg font-bold text-slate-100">{addon.name}</h3>

                    <div className="mt-4 mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">{addon.price}</span>
                        <span className="text-base text-slate-400">kr</span>
                      </div>
                      <span className="text-xs text-slate-500">{sv ? "exkl. moms" : "excl. VAT"}</span>
                    </div>

                    <ul className="space-y-3">
                      {addon.features.map((feature, fi) => (
                        <li key={fi} className="flex items-start gap-3 text-sm text-slate-300">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mt-0.5 shrink-0 text-cyan-400">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  openContactModal(
                    sv
                      ? `Hej! Jag är intresserad av tilläggen (Företagsmail och/eller Flytt av befintlig e-post). Berätta gärna mer.`
                      : `Hi! I'm interested in the add-ons (Business email and/or Migration of existing email). Please tell me more.`
                  )
                }
                className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium transition-all border border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-800/50"
              >
                {sv ? "Kom igång" : "Get started"}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-6 pt-5">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
              {sv ? "Redo att transformera din närvaro?" : "Ready to transform your presence?"}
            </span>
          </h2>
          <button
            onClick={() => openContactModal()}
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
            className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
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

            {/* Outer card clips the rounded corners so the inner scrollbar can't poke past them (works in all browsers) */}
            <div className="rounded-2xl overflow-hidden bg-slate-900/50 backdrop-blur-xl border border-slate-800">
              <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
                <ContactForm embedded initialMessage={contactIntro} onSent={() => setShowContactModal(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
