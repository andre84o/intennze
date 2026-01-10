"use client";
import ContactForm from "../components/contactForm";
import { useLanguage } from "@/app/i18n/LanguageProvider";
import { useEffect } from "react";
import { trackLead } from "@/utils/metaPixel";

export default function LandingPage() {
  const { lang } = useLanguage();
  const sv = lang === "sv";

  // Track landing page view for ad campaigns
  useEffect(() => {
    trackLead({ source: "ad_landing" });
  }, []);

  const benefits = [
    sv ? "Proffsig design som bygger förtroende" : "Professional design that builds trust",
    sv ? "Mobilanpassat och snabbt" : "Mobile-friendly and fast",
    sv ? "Tydlig plan och fast offert" : "Clear plan and fixed quote",
  ];

  const trustSignals = [
    sv ? "Kostnadsfri offert" : "Free quote",
    sv ? "Svar inom 24 timmar" : "Response within 24 hours",
    sv ? "Inga dolda kostnader" : "No hidden costs",
  ];

  const features = [
    {
      title: sv ? "Snabb leverans" : "Fast delivery",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      title: sv ? "Tydlig process" : "Clear process",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      title: sv ? "Personlig support" : "Personal support",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fuchsia-400">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <main className="min-h-screen w-full bg-slate-950 text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-6">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left - Content */}
            <div className="lg:pt-8">
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-fuchsia-400">
                  {sv ? "Vi bygger hemsidor som ger fler kunder" : "We build websites that bring more customers"}
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-400 leading-relaxed">
                {sv
                  ? "Snabba, moderna och SEO-optimerade webbsidor. Svar inom 24 timmar."
                  : "Fast, modern and SEO-optimized websites. Response within 24 hours."}
              </p>

              {/* Benefits */}
              <div className="mt-10 space-y-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-slate-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right - Contact Form */}
            <div>
              <ContactForm
                title={sv ? "Få ett prisförslag" : "Get a price quote"}
                subtitle={sv ? "Svar inom 24 timmar. Kostnadsfritt och utan bindning." : "Response within 24 hours. Free and non-binding."}
                buttonText={sv ? "Få prisförslag" : "Get quote"}
              />

              {/* Trust signals under form */}
              <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
                {trustSignals.map((signal, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {signal}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - 3 small cards */}
      <section className="relative pt-8 pb-16 md:py-16 px-6 border-t border-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4 md:gap-6">
            {features.map((feature, i) => (
              <div key={i} className="flex flex-col items-center gap-3 p-6 bg-slate-900/40 border border-slate-800/50 rounded-xl hover:border-slate-700/50 transition-colors">
                {feature.icon}
                <h3 className="font-medium text-slate-300 text-sm md:text-base text-center">{feature.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
