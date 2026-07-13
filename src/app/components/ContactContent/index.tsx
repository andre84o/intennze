"use client";
import ContactForm from "../contactForm";
import { useLanguage } from "@/app/i18n/LanguageProvider";

export default function ContactContent() {
  const { lang } = useLanguage();
  const sv = lang === "sv";

  const steps = sv
    ? [
        {
          title: "Vi går igenom din förfrågan",
          desc: "Vi granskar dina behov och ser om vi behöver mer information.",
        },
        {
          title: "Vi kontaktar dig",
          desc: "Vi återkommer vanligtvis inom en arbetsdag för att diskutera projektet.",
        },
        {
          title: "Du får ett tydligt förslag",
          desc: "När omfattningen är tydlig får du en kostnadsfri offert med pris och nästa steg.",
        },
      ]
    : [
        {
          title: "We review your request",
          desc: "We review your needs and determine whether we need any additional information.",
        },
        {
          title: "We contact you",
          desc: "We usually get back to you within one business day to discuss the project.",
        },
        {
          title: "You receive a clear proposal",
          desc: "Once the scope is clear, you receive a free quote with pricing and the next step.",
        },
      ];

  const stepAccents = [
    { ring: "from-cyan-500/20", text: "text-cyan-400" },
    { ring: "from-purple-500/20", text: "text-purple-400" },
    { ring: "from-fuchsia-500/20", text: "text-fuchsia-400" },
  ];

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
                  {sv
                    ? "Berätta vad ditt företag behöver"
                    : "Tell us what your business needs"}
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-400 leading-relaxed">
                {sv
                  ? "Behöver du en ny hemsida, ett bokningssystem eller en skräddarsydd digital lösning? Beskriv kort ditt projekt så återkommer vi med frågor och nästa steg."
                  : "Do you need a new website, a booking system or a tailored digital solution? Briefly describe your project and we will get back to you with questions and the next step."}
              </p>

              {/* Process steps */}
              <div className="mt-10">
                <h2 className="text-xl font-semibold mb-6">
                  {sv
                    ? "Vad händer efter att du skickat formuläret?"
                    : "What happens after you submit the form?"}
                </h2>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl"
                    >
                      <div
                        className={`flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-r ${stepAccents[i].ring} to-transparent rounded-full`}
                      >
                        <span className={`${stepAccents[i].text} font-bold`}>
                          {i + 1}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{step.title}</h3>
                        <p className="mt-1 text-slate-400 text-sm leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quote box */}
              <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-fuchsia-500/10 border border-slate-800 rounded-2xl">
                <h2 className="text-lg font-semibold">
                  {sv ? "Kostnadsfri offert" : "Free quote"}
                </h2>
                <p className="mt-2 text-slate-400 text-sm">
                  {sv
                    ? "Du förbinder dig inte till något genom att kontakta oss. När vi förstått vad du behöver får du ett tydligt förslag med omfattning och pris."
                    : "Contacting us does not commit you to anything. Once we understand what you need, you receive a clear proposal covering scope and price."}
                </p>
              </div>
            </div>

            {/* Right side - Form */}
            <div id="form" className="scroll-mt-24">
              <ContactForm
                title={sv ? "Berätta om ditt projekt" : "Tell us about your project"}
                subtitle={
                  sv
                    ? "Fyll i formuläret så återkommer vi med frågor och nästa steg."
                    : "Complete the form and we will get back to you with questions and the next step."
                }
                buttonText={sv ? "Skicka förfrågan" : "Send request"}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
