"use client";
import ContactForm from "../contactForm";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { dict } from "@/app/i18n/dict";

export default function ContactContent() {
  const { lang } = useLanguage();
  const t = dict[lang];
  const sv = lang === "sv";

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white overflow-x-hidden">
      <section className="relative pt-32 pb-24 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left side - Info */}
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-cyan-400 font-mono mb-6">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                {sv ? "Kontakt" : "Contact"}
              </span>

              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
                  {t.contact_page_hero_title}
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-400 leading-relaxed">
                {t.contact_page_hero_body}
              </p>

              {/* Process steps */}
              <div className="mt-10">
                <h2 className="text-xl font-semibold mb-6">{sv ? "Vad händer sen?" : "What happens next?"}</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-cyan-500/20 to-transparent rounded-full">
                      <span className="text-cyan-400 font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{t.contact_bullet_1}</h3>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r from-purple-500/20 to-transparent rounded-full">
                      <span className="text-purple-400 font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{t.contact_bullet_2}</h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quote box */}
              <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-fuchsia-500/10 border border-slate-800 rounded-2xl">
                <h2 className="text-lg font-semibold">{sv ? "Kostnadsfri offert" : "Free quote"}</h2>
                <p className="mt-2 text-slate-400 text-sm">{t.contact_note}</p>
              </div>
            </div>

            {/* Right side - Form */}
            <div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
