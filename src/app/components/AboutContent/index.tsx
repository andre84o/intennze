"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import ContactForm from "../contactForm";

export default function AboutContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";
  const [showContactModal, setShowContactModal] = useState(false);

  const T = {
    // Hero
    heroLabel: sv ? "Om Intenzze" : "About Intenzze",
    heroTitle: sv
      ? "Personlig webbutveckling med tydlig struktur"
      : "Personal web development with a clear structure",
    heroIntro: sv
      ? "Intenzze är en webbstudio som bygger moderna hemsidor och digitala lösningar för företag. Du får personlig kontakt, tydlig kommunikation och en lösning anpassad efter verksamhetens verkliga behov."
      : "Intenzze is a web studio that builds modern websites and digital solutions for businesses. You get personal contact, clear communication and a solution tailored to the real needs of your business.",

    // Behind Intenzze
    behindLabel: sv ? "Bakom Intenzze" : "Behind Intenzze",
    behindTitle: sv
      ? "Teknik kombinerad med affärsförståelse"
      : "Technology combined with business understanding",
    behindParagraphs: sv
      ? [
          "Intenzze drivs av André Torabpour, webbutvecklare med bakgrund inom försäljning, företagande och fastighetsbranschen.",
          "Den kombinationen gör att fokus inte bara ligger på hur en webbplats ser ut. Lösningen ska också vara tydlig för kunden, enkel att använda och praktisk för företaget att arbeta vidare med.",
          "Arbetet omfattar allt från enklare företagssidor till bokningssystem, kundportaler, betalningslösningar och integrationer mot externa tjänster.",
        ]
      : [
          "Intenzze is run by André Torabpour, a web developer with a background in sales, entrepreneurship and the real estate industry.",
          "That combination means the focus is not only on how a website looks. The solution should also be clear for the customer, easy to use and practical for the business to manage and develop further.",
          "The work ranges from straightforward business websites to booking systems, customer portals, payment solutions and integrations with external services.",
        ],
    behindImageAlt: sv
      ? "Arbetsmiljö hos Intenzze Webbstudio"
      : "Workspace at Intenzze Web Studio",

    // Values
    values: sv
      ? [
          {
            icon: "chat",
            title: "Personlig kontakt",
            desc: "Du har direkt kontakt under hela projektet och slipper onödiga mellanhänder.",
          },
          {
            icon: "scope",
            title: "Tydlig omfattning",
            desc: "Du vet vad som ska byggas, vad som ingår och vad nästa steg är innan arbetet börjar.",
          },
          {
            icon: "tech",
            title: "Modern och hållbar teknik",
            desc: "Lösningen byggs för att vara snabb, säker och möjlig att vidareutveckla när företaget växer.",
          },
        ]
      : [
          {
            icon: "chat",
            title: "Personal contact",
            desc: "You have direct contact throughout the project without unnecessary intermediaries.",
          },
          {
            icon: "scope",
            title: "Clear scope",
            desc: "You know what will be built, what is included and what happens next before the work begins.",
          },
          {
            icon: "tech",
            title: "Modern and maintainable technology",
            desc: "The solution is built to be fast, secure and possible to develop further as the business grows.",
          },
        ],

    // How we work
    workLabel: sv ? "Så arbetar Intenzze" : "How Intenzze works",
    workTitle: sv
      ? "Tydlighet före onödig komplexitet"
      : "Clarity before unnecessary complexity",
    workItems: sv
      ? [
          {
            title: "Vi börjar med behovet",
            desc: "Först går vi igenom företagets mål, innehåll och vilka funktioner som faktiskt behövs.",
          },
          {
            title: "Vi bygger inte mer än nödvändigt",
            desc: "Lösningen ska vara tillräckligt avancerad för uppgiften, men inte mer komplicerad än projektet kräver.",
          },
          {
            title: "Du får insyn under arbetet",
            desc: "Viktiga delar stäms av under projektet så att du vet vad som byggs och varför.",
          },
          {
            title: "Lösningen ska fungera efter lansering",
            desc: "Struktur, prestanda och teknisk kvalitet prioriteras så att webbplatsen är enkel att driva och vidareutveckla.",
          },
        ]
      : [
          {
            title: "We start with the need",
            desc: "We first review the goals, content and the features the business actually needs.",
          },
          {
            title: "We do not build more than necessary",
            desc: "The solution should be advanced enough for the task, but not more complicated than the project requires.",
          },
          {
            title: "You have visibility throughout the work",
            desc: "Important parts are reviewed during the project so you know what is being built and why.",
          },
          {
            title: "The solution should work after launch",
            desc: "Structure, performance and technical quality are prioritized so the website is easy to operate and develop further.",
          },
        ],

    // Principle
    principleLabel: sv ? "Vår princip" : "Our principle",
    principleTitle: "Keep it simple. Make it smart.",
    principleText: sv
      ? "Vi bygger inte mer komplicerat än projektet behöver vara. Först skapar vi en tydlig struktur, stabil teknik och en bra användarupplevelse. Därefter lägger vi till design och funktioner som faktiskt fyller ett syfte."
      : "We do not make a project more complicated than it needs to be. We first create a clear structure, stable technology and a good user experience. We then add design and features that serve a real purpose.",

    // What we build
    buildLabel: sv ? "Vad vi bygger" : "What we build",
    buildTitle: sv
      ? "Från företagssida till skräddarsydd lösning"
      : "From business websites to tailored solutions",
    buildItems: sv
      ? [
          "Företagshemsidor och landningssidor",
          "Bokningssystem och kundportaler",
          "E-handel och betalningslösningar",
          "Flerspråkiga webbplatser",
          "Integrationer och automatiserade arbetsflöden",
          "Hosting, teknisk drift och support",
        ]
      : [
          "Business websites and landing pages",
          "Booking systems and customer portals",
          "E-commerce and payment solutions",
          "Multilingual websites",
          "Integrations and automated workflows",
          "Hosting, technical operations and support",
        ],
    buildLink: sv ? "Se alla tjänster" : "Explore all services",

    // CTA
    ctaTitle: sv
      ? "Har du ett projekt du vill diskutera?"
      : "Do you have a project you would like to discuss?",
    ctaText: sv
      ? "Berätta kort om ditt företag och vad du behöver hjälp med. Vi återkommer med frågor och nästa steg."
      : "Tell us briefly about your business and what you need help with. We will get back to you with questions and the next step.",
    ctaBtn: sv ? "Få en kostnadsfri offert" : "Get a free quote",
  };

  const valueIcons: Record<string, React.ReactNode> = {
    chat: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    ),
    scope: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
    ),
    tech: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
    ),
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

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-cyan-400 font-mono mb-6">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            {T.heroLabel}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
              {T.heroTitle}
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {T.heroIntro}
          </p>
        </div>
      </section>

      {/* Behind Intenzze */}
      <section className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
                {T.behindLabel}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold">{T.behindTitle}</h2>
              <div className="mt-6 space-y-4">
                {T.behindParagraphs.map((p, i) => (
                  <p key={i} className="text-slate-400 leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-800">
                <Image src="/aboutpage.jpg" alt={T.behindImageAlt} fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-6 border-y border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {T.values.map((value, i) => (
              <div
                key={i}
                className="p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-transparent text-cyan-400 mb-4">
                  {valueIcons[value.icon]}
                </div>
                <h2 className="text-lg font-semibold">{value.title}</h2>
                <p className="mt-2 text-slate-400 text-sm leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Intenzze works */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
              {T.workLabel}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">{T.workTitle}</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {T.workItems.map((item, i) => (
              <div key={i} className="group p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl hover:border-cyan-500/50 transition-all duration-300">
                <span className="text-4xl font-bold text-slate-800 group-hover:text-cyan-500/30 transition-colors">
                  0{i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principle */}
      <section className="px-6 py-16 bg-slate-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-400 font-mono mb-4">
            {T.principleLabel}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {T.principleTitle}
          </h2>
          <p className="mt-6 text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {T.principleText}
          </p>
        </div>
      </section>

      {/* What we build */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-fuchsia-400 font-mono mb-4">
              {T.buildLabel}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">{T.buildTitle}</h2>
          </div>
          <ul className="grid sm:grid-cols-2 gap-4">
            {T.buildItems.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl"
              >
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0 text-cyan-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <Link
              href="/tjanster"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
            >
              {T.buildLink}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-fuchsia-500/10 border border-slate-800 p-12 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_70%)]" />
            <div className="relative">
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
