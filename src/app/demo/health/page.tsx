import Link from "next/link";
import Image from "next/image";
import BookingModal from "./components/BookingModal";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/demos/health/pexels-samkolder-2387871.jpg"
            alt="Peaceful nature scenery"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sage-900/80 via-sage-800/60 to-transparent"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <div className="max-w-2xl">
            <span className="inline-block text-white text-xl font-bold tracking-[0.3em] uppercase mb-6">
              Välkommen till Serenity
            </span>
            <h1 className="text-5xl md:text-7xl font-light text-white tracking-[0.2em] leading-tight mb-8">
              Hitta din
              <span className="block text-gradient-gold">inre harmoni</span>
            </h1>
            <p className="text-xl text-white font-light text-white leading-relaxed mb-10 max-w-xl">
              Ett exklusivt health center där vi kombinerar traditionell visdom
              med modern vetenskap för att skapa varaktig balans i ditt liv.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/services"
                className="inline-block px-10 py-4 bg-gold text-white border text-sm font-bold tracking-wider uppercase hover:bg-white/10 transition-all duration-300 text-center"
              >
                Utforska tjänster
              </Link>
              <Link
                href="/about"
                className="inline-block px-10 py-4 border border-white text-white text-sm font-bold tracking-wider uppercase hover:bg-white/10 transition-all duration-300 text-center"
              >
                Läs mer om oss
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-gold to-transparent animate-pulse"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-cream">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 luxury-card rounded-sm">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-sage-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-sage-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-sage-800 mb-3 tracking-wide">
                Holistisk vård
              </h3>
              <p className="text-sage-600 text-sm leading-relaxed">
                Vi behandlar hela människan - kropp, sinne och själ - för
                verklig transformation.
              </p>
            </div>

            <div className="text-center p-8 luxury-card rounded-sm">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-rose-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-sage-800 mb-3 tracking-wide">
                Personlig approach
              </h3>
              <p className="text-sage-600 text-sm leading-relaxed">
                Varje program anpassas efter dina unika behov och livssituation.
              </p>
            </div>

            <div className="text-center p-8 luxury-card rounded-sm">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-sage-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-sage-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-sage-800 mb-3 tracking-wide">
                Exklusiv miljö
              </h3>
              <p className="text-sage-600 text-sm leading-relaxed">
                En fridfull oas designad för att främja avkoppling och
                välbefinnande.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Preview Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-[4/5] relative rounded-sm overflow-hidden">
                <Image
                  src="/demos/health/pexels-elly-fairytale-3822621.jpg"
                  alt="Wellness and relaxation"
                  fill
                  className="object-cover image-hover"
                />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 border-2 border-gold/30 rounded-sm -z-10"></div>
            </div>

            <div className="lg:pl-8">
              <span className="text-gold text-sm tracking-[0.3em] uppercase">
                Om oss
              </span>
              <h2 className="text-4xl md:text-5xl font-light text-sage-800 mt-4 mb-8 leading-tight">
                En plats för
                <span className="block text-sage-600">total återhämtning</span>
              </h2>
              <div className="w-20 h-px bg-gold mb-8"></div>
              <p className="text-sage-600 leading-relaxed mb-6">
                Serenity Health Center grundades med en vision - att skapa en
                fristad där varje besökare kan finna lugn, balans och förnyad
                energi.
              </p>
              <p className="text-sage-600 leading-relaxed mb-10">
                Vårt team av erfarna terapeuter och hälsoexperter arbetar
                tillsammans för att erbjuda dig en skräddarsydd upplevelse som
                adresserar dina unika behov och mål.
              </p>
              <Link
                href="/about"
                className="inline-flex items-center text-sage-700 text-sm font-medium tracking-wider uppercase group"
              >
                Läs mer om vår filosofi
                <svg
                  className="w-5 h-5 ml-3 group-hover:translate-x-2 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 bg-gradient-to-b from-sage-50 to-cream">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-16">
            <span className="text-gold text-sm tracking-[0.3em] uppercase">
              Våra tjänster
            </span>
            <h2 className="text-4xl md:text-5xl font-light text-sage-800 mt-4 mb-6">
              Skräddarsydda behandlingar
            </h2>
            <div className="w-20 h-px bg-gold mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative overflow-hidden rounded-sm aspect-[3/4]">
              <Image
                src="/demos/health/pexels-mtyutina-814264.jpg"
                alt="Yoga and meditation"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h3 className="text-xl font-semibold text-white mb-2 tracking-wide">
                  Yoga & Meditation
                </h3>
                <p className="text-white/90 text-sm mb-4 font-medium">
                  Stärk kroppen och lugna sinnet genom medveten rörelse.
                </p>
                <Link
                  href="/services"
                  className="text-gold font-semibold text-sm tracking-wider uppercase hover:text-gold-light transition-colors"
                >
                  Läs mer →
                </Link>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-sm aspect-[3/4]">
              <Image
                src="/demos/health/fruits.jpg"
                alt="Nutrition and health"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h3 className="text-xl font-semibold text-white mb-2 tracking-wide">
                  Näring & Hälsa
                </h3>
                <p className="text-white/90 text-sm mb-4 font-medium">
                  Personliga kostplaner grundade i vetenskap.
                </p>
                <Link
                  href="/services"
                  className="text-gold font-semibold text-sm tracking-wider uppercase hover:text-gold-light transition-colors"
                >
                  Läs mer →
                </Link>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-sm aspect-[3/4]">
              <Image
                src="/demos/health/pexels-pixabay-355863.jpg"
                alt="Personal coaching"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h3 className="text-xl font-semibold text-white mb-2 tracking-wide">
                  Personlig Coachning
                </h3>
                <p className="text-white/90 text-sm mb-4 font-medium">
                  Guidning på din resa mot ett balanserat liv.
                </p>
                <Link
                  href="/services"
                  className="text-gold font-semibold text-sm tracking-wider uppercase hover:text-gold-light transition-colors"
                >
                  Läs mer →
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/services"
              className="inline-block px-10 py-4 bg-sage-600 text-black border text-sm font-medium tracking-wider uppercase hover:bg-sage-700 transition-all duration-300"
            >
              Se alla tjänster
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial / Quote Section */}
      <section className="py-24 bg-sage-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gold rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-rose-300 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center relative z-10">
          <svg
            className="w-12 h-12 text-gold/40 mx-auto mb-8"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
          </svg>
          <p className="text-2xl md:text-3xl font-light text-black leading-relaxed mb-8">
            "Att ta hand om sin hälsa är den största investeringen man kan göra.
            Hos Serenity hittade jag verktygen för att verkligen förändra mitt
            liv."
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-px h-8 bg-gold/40"></div>
            <span className="text-sage-300 text-sm tracking-wider uppercase">
              Anna L.
            </span>
            <div className="w-px h-8 bg-gold/40"></div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-cream">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 text-center">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">
            Börja din resa
          </span>
          <h2 className="text-4xl md:text-5xl font-light text-sage-800 mt-4 mb-6">
            Redo att förändra ditt liv?
          </h2>
          <p className="text-sage-600 text-lg mb-10 max-w-2xl mx-auto">
            Boka en kostnadsfri konsultation och låt oss tillsammans skapa en
            plan för din optimala hälsa och välbefinnande.
          </p>
          <div className="max-h-[50vh] overflow-auto inline-block">
            <BookingModal />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-sage-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <Image
                  src="/demos/health/logo.png"
                  alt="Serenity Health Center"
                  width={60}
                  height={60}
                  className="object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-xl font-semibold tracking-[0.2em] text-black">
                    SERENITY
                  </span>
                  <span className="text-[10px] tracking-[0.3em] text-gold uppercase font-medium">
                    Health Center
                  </span>
                </div>
              </div>
              <p className="text-sage-400 text-sm leading-relaxed max-w-sm">
                Din partner för holistisk hälsa och välbefinnande. Vi hjälper
                dig att hitta balans i kropp, sinne och själ.
              </p>
            </div>

            <div>
              <h4 className="text-black font-medium mb-4 tracking-wide">
                Snabblänkar
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/"
                    className="text-sage-400 hover:text-gold text-sm transition-colors"
                  >
                    Hem
                  </Link>
                </li>
                <li>
                  <Link
                    href="/services"
                    className="text-sage-400 hover:text-gold text-sm transition-colors"
                  >
                    Tjänster
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="text-sage-400 hover:text-gold text-sm transition-colors"
                  >
                    Om oss
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-black font-medium mb-4 tracking-wide">
                Kontakt
              </h4>
              <ul className="space-y-3 text-sage-400 text-sm">
                <li>Lugna Gatan 123</li>
                <li>123 45 Stockholm</li>
                <li>info@serenity.se</li>
                <li>08-123 45 67</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-sage-800 mt-12 pt-8 text-center">
            <p className="text-sage-500 text-sm">
              © 2024 Serenity Health Center. Alla rättigheter förbehållna.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
