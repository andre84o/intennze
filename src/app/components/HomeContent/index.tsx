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
      title: sv ? "Barber" : "Barber",
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
    },
    {
      url: "https://demo-health-red.vercel.app/",
      title: sv ? "Hälsa" : "Health",
      desc: sv ? "Fräsch design för hälsobranschen" : "Fresh design for health industry",
      gradient: "from-emerald-500/50 to-emerald-500/20",
      border: "hover:border-emerald-500/50"
    },
    {
      url: "https://demo-law-jet.vercel.app/",
      title: sv ? "Juristbyrå" : "Law Firm",
      desc: sv ? "Professionell juridisk rådgivning" : "Professional legal advice",
      gradient: "from-indigo-500/50 to-indigo-500/20",
      border: "hover:border-indigo-500/50"
    },
    {
      url: "https://clinic-two-omega.vercel.app",
      title: sv ? "Klinik" : "Clinic",
      desc: sv ? "Modern design för vårdmottagning" : "Modern design for healthcare",
      gradient: "from-rose-500/50 to-rose-500/20",
      border: "hover:border-rose-500/50"
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

      {/* Technologies */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
            {sv ? "Tekniker & Verktyg" : "Technologies & Tools"}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {sv ? "Moderna verktyg för moderna lösningar" : "Modern tools for modern solutions"}
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-12">
            {sv
              ? "Vi använder branschledande teknologier för att bygga snabba och skalbara webbplatser."
              : "We use industry-leading technologies to build fast and scalable websites."}
          </p>

          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
            {/* React */}
            <div className="group flex flex-col items-center gap-2">
              <div className="w-14 h-14 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-cyan-500/50 transition-colors">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#61DAFB">
                  <path d="M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 01-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9c-.6 0-1.17 0-1.71.03-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03.6 0 1.17 0 1.71-.03.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68 0 1.69-1.83 2.93-4.37 3.68.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.38 1.95-1.46-.84-1.62-3.05-1-5.63-2.54-.75-4.37-1.99-4.37-3.68 0-1.69 1.83-2.93 4.37-3.68-.62-2.58-.46-4.79 1-5.63 1.47-.84 3.46.12 5.38 1.95 1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26 2.1-.63 3.28-1.53 3.28-2.26 0-.73-1.18-1.63-3.28-2.26-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26-2.1.63-3.28 1.53-3.28 2.26 0 .73 1.18 1.63 3.28 2.26.25-.76.55-1.51.89-2.26m9 2.26l-.3.51c.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.29.51m-2.89 4.04c1.59 1.5 2.97 2.08 3.59 1.7.64-.35.83-1.82.32-3.96-.77.16-1.58.28-2.4.36-.48.67-.99 1.31-1.51 1.9M8.08 9.74l.3-.51c-.31.05-.61.1-.88.16.07.28.18.57.29.86l.29-.51m2.89-4.04C9.38 4.2 8 3.62 7.37 4c-.63.35-.82 1.82-.31 3.96a22.7 22.7 0 012.4-.36c.48-.67.99-1.31 1.51-1.9z"/>
                </svg>
              </div>
              <span className="text-xs text-slate-500">React</span>
            </div>

            {/* Next.js */}
            <div className="group flex flex-col items-center gap-2">
              <div className="w-14 h-14 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-slate-500/50 transition-colors">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="white">
                  <path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 01-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 00-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.251 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 00-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 01-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 01-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 01.174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 004.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 002.466-2.163 11.944 11.944 0 002.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 00-2.499-.523A33.119 33.119 0 0011.572 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 01.237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 01.233-.296c.096-.05.13-.054.5-.054z"/>
                </svg>
              </div>
              <span className="text-xs text-slate-500">Next.js</span>
            </div>

            {/* TypeScript */}
            <div className="group flex flex-col items-center gap-2">
              <div className="w-14 h-14 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-blue-500/50 transition-colors">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#3178C6">
                  <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 011.306.34v2.458a3.95 3.95 0 00-.643-.361 5.093 5.093 0 00-.717-.26 5.453 5.453 0 00-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 00-.623.242c-.17.104-.3.229-.393.374a.888.888 0 00-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 01-1.012 1.085 4.38 4.38 0 01-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 01-1.84-.164 5.544 5.544 0 01-1.512-.493v-2.63a5.033 5.033 0 003.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 00-.074-1.089 2.12 2.12 0 00-.537-.5 5.597 5.597 0 00-.807-.444 27.72 27.72 0 00-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 011.47-.629 7.536 7.536 0 011.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/>
                </svg>
              </div>
              <span className="text-xs text-slate-500">TypeScript</span>
            </div>

            {/* MySQL */}
            <div className="group flex flex-col items-center gap-2">
              <div className="w-14 h-14 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-orange-500/50 transition-colors">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#4479A1">
                  <path d="M16.405 5.501c-.115 0-.193.014-.274.033v.013h.014c.054.104.146.18.214.273.054.107.1.214.154.32l.014-.015c.094-.066.14-.172.14-.333-.04-.047-.046-.094-.08-.14-.04-.067-.126-.1-.18-.153zM5.77 18.695h-.927a50.854 50.854 0 00-.27-4.41h-.008l-1.41 4.41H2.45l-1.4-4.41h-.01a72.892 72.892 0 00-.195 4.41H0c.055-1.966.192-3.81.41-5.53h1.15l1.335 4.064h.008l1.347-4.063h1.095c.242 2.015.384 3.86.428 5.53zm4.017-4.08c-.378 2.045-.876 3.533-1.492 4.46-.482.716-1.01 1.073-1.583 1.073-.153 0-.34-.046-.566-.138v-.494c.11.017.24.026.386.026.268 0 .483-.075.647-.222.197-.18.295-.382.295-.605 0-.155-.077-.47-.23-.944L6.23 14.615h.91l.727 2.36c.164.536.233.91.205 1.123.4-1.064.678-2.227.835-3.483zm12.325 4.08h-2.63v-5.53h.885v4.85h1.745zm-3.32.135l-1.016-.5c.09-.076.177-.158.255-.25.433-.506.648-1.258.648-2.253 0-1.83-.718-2.746-2.155-2.746-.704 0-1.254.232-1.65.697-.43.508-.646 1.256-.646 2.245 0 .972.19 1.686.574 2.14.35.41.877.615 1.583.615.264 0 .506-.033.725-.098l1.325.772.36-.623zM15.5 17.588c-.225-.36-.337-.94-.337-1.736 0-1.393.424-2.09 1.27-2.09.443 0 .77.167.977.5.224.362.336.936.336 1.723 0 1.404-.424 2.108-1.27 2.108-.445 0-.77-.167-.978-.5zm-1.658-.425c0 .47-.172.856-.516 1.156-.344.3-.803.45-1.384.45-.543 0-1.064-.172-1.573-.515l.237-.476c.438.22.833.328 1.19.328.332 0 .593-.073.783-.22a.754.754 0 00.3-.615c0-.33-.23-.61-.648-.845-.388-.213-1.163-.657-1.163-.657-.422-.307-.632-.636-.632-1.177 0-.45.157-.81.47-1.085.315-.278.72-.415 1.22-.415.512 0 .98.136 1.4.41l-.213.476a2.726 2.726 0 00-1.064-.23c-.283 0-.502.068-.654.206a.685.685 0 00-.248.524c0 .328.234.61.666.85.393.215 1.187.67 1.187.67.433.305.648.63.648 1.168zm9.382-5.852c-.535-.014-.95.04-1.297.188-.1.04-.26.04-.274.167.055.053.063.14.11.214.08.134.218.313.346.407.14.11.28.216.427.31.26.16.555.255.81.416.145.094.293.213.44.313.073.05.12.14.214.172v-.02c-.046-.06-.06-.147-.105-.214-.067-.067-.134-.127-.2-.193a3.223 3.223 0 00-.695-.675c-.214-.146-.682-.35-.77-.595l-.013-.014c.146-.013.32-.066.46-.106.227-.06.435-.047.67-.106.106-.027.213-.06.32-.094v-.06c-.12-.12-.21-.283-.334-.395a8.867 8.867 0 00-1.104-.823c-.21-.134-.476-.22-.697-.334-.08-.04-.214-.06-.26-.127-.12-.146-.19-.34-.275-.514a17.69 17.69 0 01-.547-1.163c-.12-.262-.193-.523-.34-.763-.69-1.137-1.437-1.826-2.586-2.5-.247-.14-.543-.2-.856-.274-.167-.008-.334-.02-.5-.027-.11-.047-.216-.174-.31-.235-.38-.24-1.364-.76-1.644-.072-.18.434.267.862.422 1.082.115.153.26.328.34.5.047.116.06.235.107.356.106.294.207.622.347.897.073.14.153.287.247.413.054.073.146.107.167.227-.094.136-.1.334-.154.5-.24.757-.146 1.693.194 2.25.107.166.362.534.703.393.3-.12.234-.5.32-.835.02-.08.007-.133.048-.187v.015c.094.188.188.367.274.555.206.328.566.668.867.895.16.12.287.328.487.402v-.02h-.015c-.043-.058-.1-.086-.154-.133a3.445 3.445 0 01-.35-.4 8.76 8.76 0 01-.747-1.218c-.11-.21-.202-.436-.29-.643-.04-.08-.04-.2-.107-.24-.1.146-.247.273-.32.453-.127.288-.14.642-.188 1.01-.027.007-.014 0-.027.014-.214-.052-.287-.274-.367-.46-.2-.475-.233-1.238-.06-1.785.047-.14.247-.582.167-.716-.042-.127-.174-.2-.247-.303a2.478 2.478 0 01-.24-.427c-.16-.374-.24-.788-.414-1.162-.08-.173-.22-.354-.334-.513-.127-.18-.267-.307-.368-.52-.033-.073-.08-.194-.027-.274.014-.054.042-.075.094-.09.088-.072.335.022.422.062.238.107.435.2.64.327.094.073.194.22.307.247h.134c.208.047.442.014.636.068.347.1.656.253.942.42.883.51 1.607 1.238 2.1 2.11.082.14.12.28.2.427.16.295.36.595.52.883.16.287.315.58.528.814.11.12.535.182.727.246.14.048.36.1.488.16.257.123.508.27.757.41.125.067.503.213.522.36z"/>
                </svg>
              </div>
              <span className="text-xs text-slate-500">MySQL</span>
            </div>

            {/* WordPress */}
            <div className="group flex flex-col items-center gap-2">
              <div className="w-14 h-14 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-sky-500/50 transition-colors">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#21759B">
                  <path d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.11m-7.981.105c.647-.034 1.232-.105 1.232-.105.582-.07.514-.925-.068-.892 0 0-1.749.138-2.877.138-.962 0-2.584-.138-2.584-.138-.582-.034-.649.856-.066.891 0 0 .549.07 1.127.103l1.674 4.576-2.35 7.05-3.911-11.626c.648-.034 1.233-.105 1.233-.105.583-.07.514-.925-.066-.892 0 0-1.749.138-2.878.138-.202 0-.443-.005-.693-.014C3.87 3.406 7.633 1.22 12 1.22c3.254 0 6.22 1.246 8.442 3.284-.054-.003-.108-.008-.163-.008-1.053 0-1.797.921-1.797 1.909 0 .887.513 1.637 1.058 2.523.411.72.887 1.645.887 2.981 0 .924-.358 1.994-.831 3.487l-1.086 3.632-3.933-11.696zm-7.963 17.2l3.381-9.825 3.461 9.484c.023.054.049.104.078.152-2.082.756-4.329.986-6.92.186zm-2.269-.7c-4.047-1.852-6.443-5.883-6.443-10.43 0-1.953.492-3.79 1.351-5.399l3.726 10.205 1.366 3.624z"/>
                </svg>
              </div>
              <span className="text-xs text-slate-500">WordPress</span>
            </div>

            {/* WooCommerce */}
            <div className="group flex flex-col items-center gap-2">
              <div className="w-14 h-14 flex items-center justify-center bg-slate-800/50 rounded-xl border border-slate-700 group-hover:border-purple-500/50 transition-colors">
                <svg viewBox="0 0 24 24" className="w-8 h-8" fill="#96588A">
                  <path d="M2.227 4.857A2.228 2.228 0 000 7.094v7.457c0 1.236 1.001 2.237 2.237 2.237h9.253l4.229 2.355-.962-2.355h7.006c1.236 0 2.237-1 2.237-2.237V7.094c0-1.236-1-2.237-2.237-2.237zm-.33 1.678h20.178c.31 0 .559.249.559.559v7.457c0 .31-.249.559-.559.559h-7.006c-.372 0-.693.263-.762.629l-.269 1.029-2.012-1.121a.756.756 0 00-.368-.097H2.227a.558.558 0 01-.559-.559V7.094c0-.31.248-.559.559-.559zm2.559 1.469c-.735 0-1.343.578-1.467 1.393-.14.913.113 1.678.703 2.193.42.368 1.03.564 1.735.564.09 0 .182-.003.275-.012l-.062.349a.372.372 0 00.368.449h.022a.374.374 0 00.365-.293l.275-1.205a2.53 2.53 0 001.118-1.049c.174-.307.279-.647.307-1.001a.373.373 0 00-.33-.407.376.376 0 00-.407.33 1.79 1.79 0 01-.209.678 1.767 1.767 0 01-.84.746l.187-.824a.374.374 0 00-.736-.127l-.275 1.205c-.059.007-.115.01-.17.01-.53 0-.968-.151-1.236-.426-.365-.378-.523-.877-.434-1.453.072-.473.362-.826.738-.826.14 0 .361.048.542.323a.373.373 0 10.622-.411c-.348-.526-.813-.706-1.184-.706zm6.283.002c-.735 0-1.343.578-1.467 1.393-.14.913.113 1.678.703 2.193.42.368 1.03.564 1.735.564.09 0 .182-.003.275-.012l-.062.349a.371.371 0 00.367.449h.023a.374.374 0 00.365-.293l.274-1.205a2.53 2.53 0 001.119-1.049c.174-.307.279-.647.307-1.001a.373.373 0 00-.33-.407.376.376 0 00-.407.33 1.79 1.79 0 01-.209.678 1.768 1.768 0 01-.84.746l.188-.824a.373.373 0 10-.736-.127l-.275 1.205c-.059.007-.115.01-.17.01-.53 0-.968-.151-1.236-.426-.365-.378-.523-.877-.434-1.453.072-.473.362-.826.738-.826.14 0 .361.048.542.323a.372.372 0 10.621-.411c-.348-.526-.812-.706-1.183-.706zm5.875.008a.932.932 0 00-.728.347c-.213.265-.295.615-.229.982.067.372.27.682.558.856.144.087.302.13.467.13.099 0 .201-.017.307-.052l-.021.121a.373.373 0 00.737.126l.315-1.838a.373.373 0 00-.737-.127l-.048.276a.83.83 0 00-.152-.335c-.139-.19-.309-.297-.469-.486zm3.28 0a.932.932 0 00-.728.347c-.213.265-.295.615-.229.982.067.372.27.682.558.856.144.087.302.13.467.13.099 0 .201-.017.307-.052l-.021.121a.373.373 0 00.737.126l.315-1.838a.373.373 0 00-.737-.127l-.048.276a.83.83 0 00-.152-.335c-.139-.19-.309-.297-.469-.486z"/>
                </svg>
              </div>
              <span className="text-xs text-slate-500">WooCommerce</span>
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

          {/* Grid - Flex for better centering of 5 items */}
          <div className="flex flex-wrap justify-center gap-6">
            {demos.map((demo, i) => (
              <a
                key={i}
                href={demo.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-3xl overflow-hidden transition-all duration-500 ${demo.border} hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1`}
              >
                {/* Screenshot */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-t ${demo.gradient} opacity-20 group-hover:opacity-40 transition-opacity duration-500 z-10`} />
                  <img
                    src={`https://api.microlink.io/?url=${encodeURIComponent(demo.url)}&screenshot=true&meta=false&embed=screenshot.url`}
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
                      <h3 className="text-xl font-bold mb-2 text-slate-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-all">
                        {demo.title}
                      </h3>
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
