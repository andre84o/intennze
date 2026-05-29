"use client";

import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (!cookieConsent) {
      setShowCookieBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowCookieBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem("cookieConsent", "declined");
    setShowCookieBanner(false);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <Image
                src="/demos/lawyer/logo.png"
                alt="Lindberg & Partners"
                width={200}
                height={50}
                className="h-30 w-auto"
              />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#tjanster" className="text-stone-600 hover:text-stone-900 transition-colors text-sm font-medium">
                Tjänster
              </a>
              <a href="#om-oss" className="text-stone-600 hover:text-stone-900 transition-colors text-sm font-medium">
                Om oss
              </a>
              <a href="#team" className="text-stone-600 hover:text-stone-900 transition-colors text-sm font-medium">
                Vårt team
              </a>
              <a href="#kontakt" className="text-stone-600 hover:text-stone-900 transition-colors text-sm font-medium">
                Kontakt
              </a>
              <a
                href="#kontakt"
                className="bg-stone-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                Boka konsultation
              </a>
            </div>
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Öppna meny"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-stone-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-stone-200">
            <div className="px-6 py-4 space-y-4">
              <a
                href="#tjanster"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-stone-600 hover:text-stone-900 transition-colors font-medium"
              >
                Tjänster
              </a>
              <a
                href="#om-oss"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-stone-600 hover:text-stone-900 transition-colors font-medium"
              >
                Om oss
              </a>
              <a
                href="#team"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-stone-600 hover:text-stone-900 transition-colors font-medium"
              >
                Vårt team
              </a>
              <a
                href="#kontakt"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-stone-600 hover:text-stone-900 transition-colors font-medium"
              >
                Kontakt
              </a>
              <a
                href="#kontakt"
                onClick={() => setMobileMenuOpen(false)}
                className="block bg-stone-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-stone-800 transition-colors text-center"
              >
                Boka konsultation
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center">
        <div className="absolute inset-0">
          <Image
            src="/demos/lawyer/tingey-injury-law-firm-veNb0DDegzE-unsplash.jpg"
            alt="Advokatbyrå"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-900/90 via-stone-900/70 to-stone-900/40" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-20">
          <div className="max-w-2xl">
            <p className="text-amber-400 font-medium tracking-widest text-sm mb-4 uppercase">
              Advokatbyrå sedan 1987
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-semibold text-white leading-tight mb-6">
              Juridisk expertis med integritet och precision
            </h1>
            <p className="text-lg text-stone-300 leading-relaxed mb-8 max-w-xl">
              Vi kombinerar djup juridisk kompetens med personligt engagemang för att leverera
              lösningar som skyddar dina intressen och skapar värde för din framtid.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#kontakt"
                className="bg-amber-600 text-white px-8 py-4 text-sm font-medium hover:bg-amber-700 transition-colors text-center"
              >
                Boka kostnadsfri konsultation
              </a>
              <a
                href="#tjanster"
                className="border border-white/30 text-white px-8 py-4 text-sm font-medium hover:bg-white/10 transition-colors text-center"
              >
                Våra tjänster
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-stone-900 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-4xl font-serif font-semibold text-white mb-2">35+</p>
              <p className="text-stone-400 text-sm">År av erfarenhet</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-serif font-semibold text-white mb-2">2500+</p>
              <p className="text-stone-400 text-sm">Framgångsrika ärenden</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-serif font-semibold text-white mb-2">98%</p>
              <p className="text-stone-400 text-sm">Nöjda klienter</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-serif font-semibold text-white mb-2">15</p>
              <p className="text-stone-400 text-sm">Specialiserade jurister</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="tjanster" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-amber-600 font-medium tracking-widest text-sm mb-3 uppercase">
              Våra tjänster
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-stone-900 mb-4">
              Juridisk expertis inom alla områden
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              Med bred kompetens och djup specialisering erbjuder vi juridisk rådgivning
              som möter dina specifika behov.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Affärsjuridik",
                description: "Strategisk rådgivning för företag i alla faser, från etablering till expansion och transaktioner.",
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
              },
              {
                title: "Familjerätt",
                description: "Känslig och professionell hantering av äktenskapsskillnad, vårdnad, arv och bodelning.",
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
              },
              {
                title: "Tvistelösning",
                description: "Effektiv representation i domstol och skiljeförfaranden med fokus på optimala resultat.",
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                ),
              },
              {
                title: "Fastighetsrätt",
                description: "Juridisk rådgivning vid köp, försäljning och förvaltning av fastigheter och bostadsrätter.",
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                ),
              },
              {
                title: "Arbetsrätt",
                description: "Stöd till arbetsgivare och arbetstagare i anställningsfrågor, uppsägningar och förhandlingar.",
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                title: "Avtalsrätt",
                description: "Utformning, granskning och förhandling av avtal för att säkerställa dina rättigheter.",
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
            ].map((service, index) => (
              <div
                key={index}
                className="group p-8 bg-stone-50 hover:bg-stone-900 transition-all duration-300"
              >
                <div className="text-amber-600 group-hover:text-amber-400 mb-5 transition-colors">
                  {service.icon}
                </div>
                <h3 className="text-xl font-serif font-semibold text-stone-900 group-hover:text-white mb-3 transition-colors">
                  {service.title}
                </h3>
                <p className="text-stone-600 group-hover:text-stone-400 transition-colors">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="om-oss" className="py-24 bg-stone-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="relative h-[500px]">
                <Image
                  src="/demos/lawyer/tingey-injury-law-firm-DZpc4UY8ZtY-unsplash.jpg"
                  alt="Vårt kontor"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-8 bg-amber-600 p-8 hidden lg:block">
                <p className="text-white text-5xl font-serif font-bold mb-1">35</p>
                <p className="text-amber-100 text-sm">År av excellens</p>
              </div>
            </div>
            <div>
              <p className="text-amber-600 font-medium tracking-widest text-sm mb-3 uppercase">
                Om oss
              </p>
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-stone-900 mb-6">
                En tradition av juridisk excellens
              </h2>
              <p className="text-stone-600 leading-relaxed mb-6">
                Sedan 1987 har Lindberg & Partners varit en ledande kraft inom svensk
                rättstillämpning. Vår byrå grundades på principerna om integritet,
                professionalism och ovillkorligt engagemang för våra klienters intressen.
              </p>
              <p className="text-stone-600 leading-relaxed mb-8">
                Vi tror på att bygga långsiktiga relationer med våra klienter genom att
                leverera juridiska lösningar av högsta kvalitet. Vårt team av erfarna
                jurister kombinerar djup expertis med en personlig approach som säkerställer
                att varje ärende får den uppmärksamhet det förtjänar.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-stone-700 font-medium">Personlig rådgivning</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-stone-700 font-medium">Resultatfokuserat</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-stone-700 font-medium">Transparent prissättning</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-stone-700 font-medium">Snabb responstid</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-amber-600 font-medium tracking-widest text-sm mb-3 uppercase">
              Vårt team
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-stone-900 mb-4">
              Erfarna jurister på din sida
            </h2>
            <p className="text-stone-600 max-w-2xl mx-auto">
              Vårt team består av dedikerade jurister med bred erfarenhet och djup
              specialistkompetens inom respektive rättsområde.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                name: "Erik Lindberg",
                role: "Managing Partner",
                specialty: "Affärsjuridik",
                image: "/demos/lawyer/hunters-race-MYbhN8KaaEc-unsplash.jpg",
              },
              {
                name: "Anna Bergström",
                role: "Senior Partner",
                specialty: "Familjerätt",
                image: "/demos/lawyer/gabrielle-henderson-HJckKnwCXxQ-unsplash.jpg",
              },
              {
                name: "Marcus Holm",
                role: "Partner",
                specialty: "Tvistelösning",
                image: "/demos/lawyer/dmitrij-paskevic-YjVa-F9P9kk-unsplash.jpg",
              },
              {
                name: "Sofia Ekström",
                role: "Senior Associate",
                specialty: "Arbetsrätt",
                image: "/demos/lawyer/sigmund-HsTnjCVQ798-unsplash.jpg",
              },
            ].map((member, index) => (
              <div key={index} className="group">
                <div className="relative h-80 mb-5 overflow-hidden">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/20 transition-all duration-300" />
                </div>
                <h3 className="text-lg font-serif font-semibold text-stone-900 mb-1">
                  {member.name}
                </h3>
                <p className="text-amber-600 text-sm font-medium mb-1">{member.role}</p>
                <p className="text-stone-500 text-sm">{member.specialty}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-24 bg-stone-900">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <svg className="w-12 h-12 text-amber-500 mx-auto mb-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <blockquote className="text-2xl md:text-3xl font-serif text-white leading-relaxed mb-8">
            Lindberg & Partners har varit vår juridiska partner i över tio år. Deras professionalism,
            djupa kunskap och genuina engagemang har varit ovärderlig för vår verksamhet.
          </blockquote>
          <div>
            <p className="text-white font-medium">Johan Andersson</p>
            <p className="text-stone-400 text-sm">VD, Andersson Holding AB</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="kontakt" className="py-24 bg-stone-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <p className="text-amber-600 font-medium tracking-widest text-sm mb-3 uppercase">
                Kontakta oss
              </p>
              <h2 className="text-3xl md:text-4xl font-serif font-semibold text-stone-900 mb-6">
                Låt oss diskutera ditt ärende
              </h2>
              <p className="text-stone-600 leading-relaxed mb-8">
                Boka en kostnadsfri inledande konsultation där vi går igenom ditt ärende
                och diskuterar hur vi bäst kan hjälpa dig.
              </p>
              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-stone-900 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-stone-900 mb-1">Besöksadress</p>
                    <p className="text-stone-600">Strandvägen 7A, 114 56 Stockholm</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-stone-900 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-stone-900 mb-1">E-post</p>
                    <p className="text-stone-600">info@intenzze.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-stone-900 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-stone-900 mb-1">Telefon</p>
                    <p className="text-stone-600">08-123 45 67</p>
                  </div>
                </div>
              </div>
              </div>
            <div className="bg-white p-8 lg:p-10">
              <h3 className="text-xl font-serif font-semibold text-stone-900 mb-6">
                Skicka ett meddelande
              </h3>
              <form className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-2">
                      Namn
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-3 border border-stone-300 focus:border-stone-900 focus:outline-none transition-colors"
                      placeholder="Ditt namn"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
                      E-post
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-3 border border-stone-300 focus:border-stone-900 focus:outline-none transition-colors"
                      placeholder="din@email.se"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-stone-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className="w-full px-4 py-3 border border-stone-300 focus:border-stone-900 focus:outline-none transition-colors"
                    placeholder="070-123 45 67"
                  />
                </div>
                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-stone-700 mb-2">
                    Ärende
                  </label>
                  <select
                    id="service"
                    className="w-full px-4 py-3 border border-stone-300 focus:border-stone-900 focus:outline-none transition-colors bg-white"
                  >
                    <option value="">Välj ärendetyp</option>
                    <option value="business">Affärsjuridik</option>
                    <option value="family">Familjerätt</option>
                    <option value="dispute">Tvistelösning</option>
                    <option value="property">Fastighetsrätt</option>
                    <option value="labor">Arbetsrätt</option>
                    <option value="contract">Avtalsrätt</option>
                    <option value="other">Annat</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-stone-700 mb-2">
                    Meddelande
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-4 py-3 border border-stone-300 focus:border-stone-900 focus:outline-none transition-colors resize-none"
                    placeholder="Beskriv kort ditt ärende..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-stone-900 text-white py-4 font-medium hover:bg-stone-800 transition-colors"
                >
                  Skicka meddelande
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-14 mb-12">
            <div>
              <div className="-mb-6 -translate-y-6">
                <Image
                  src="/demos/lawyer/logo2.png"
                  alt="Lindberg & Partners"
                  width={180}
                  height={45}
                  className="h-30 w-auto"
                />
              </div>
              <p className="text-stone-400 text-sm leading-relaxed mb-4">
                Ledande advokatbyrå med expertis inom affärsjuridik, familjerätt
                och tvistelösning sedan 1987.
              </p>
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center hover:bg-stone-700 transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Tjänster</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-stone-400 hover:text-white text-sm transition-colors">Affärsjuridik</a></li>
                <li><a href="#" className="text-stone-400 hover:text-white text-sm transition-colors">Familjerätt</a></li>
                <li><a href="#" className="text-stone-400 hover:text-white text-sm transition-colors">Tvistelösning</a></li>
                <li><a href="#" className="text-stone-400 hover:text-white text-sm transition-colors">Fastighetsrätt</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Om byrån</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-stone-400 hover:text-white text-sm transition-colors">Om oss</a></li>
                <li><a href="#" className="text-stone-400 hover:text-white text-sm transition-colors">Vårt team</a></li>
                <li><a href="#" className="text-stone-400 hover:text-white text-sm transition-colors">Karriär</a></li>
                <li><a href="#" className="text-stone-400 hover:text-white text-sm transition-colors">Nyheter</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-medium mb-4">Kontakt</h4>
              <ul className="space-y-3 text-stone-400 text-sm">
                <li>Strandvägen 7A</li>
                <li>114 56 Stockholm</li>
                <li>08-123 45 67</li>
                <li>info@intenzze.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-stone-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-stone-500 text-sm">
                © 2024 Lindberg & Partners Advokatbyrå. Alla rättigheter förbehållna.
              </p>
              <p className="text-stone-500 text-sm">
                Design & development by <a href="https://www.intenzze.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white transition-colors">Intenzze</a>
              </p>
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-stone-500 hover:text-white text-sm transition-colors">Integritetspolicy</a>
              <a href="#" className="text-stone-500 hover:text-white text-sm transition-colors">Villkor</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Cookie Banner */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-stone-900 border-t border-stone-700 p-4 md:p-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-white text-sm md:text-base">
                Vi använder cookies för att förbättra din upplevelse på vår webbplats.
              </p>
              <p className="text-stone-400 text-xs md:text-sm mt-1">
                Genom att fortsätta använda sidan godkänner du vår användning av cookies.{" "}
                <a href="#" className="underline hover:text-white transition-colors">
                  Läs mer
                </a>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={declineCookies}
                className="px-4 py-2 text-sm font-medium text-stone-300 hover:text-white border border-stone-600 hover:border-stone-500 transition-colors"
              >
                Avvisa
              </button>
              <button
                onClick={acceptCookies}
                className="px-4 py-2 text-sm font-medium bg-amber-600 text-white hover:bg-amber-500 transition-colors"
              >
                Acceptera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
