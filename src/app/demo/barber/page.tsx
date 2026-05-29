import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-charcoal text-white font-[family-name:var(--font-lato)]">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-charcoal/95 backdrop-blur-sm border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="#" className="font-[family-name:var(--font-playfair)] text-2xl text-gold tracking-wide">
              KLASSISK
            </a>
            <div className="hidden md:flex items-center gap-8">
              <a href="#tjanster" className="text-sm uppercase tracking-widest hover:text-gold transition-colors">Tjänster</a>
              <a href="#galleri" className="text-sm uppercase tracking-widest hover:text-gold transition-colors">Galleri</a>
              <a href="#om-oss" className="text-sm uppercase tracking-widest hover:text-gold transition-colors">Om oss</a>
              <a href="#kontakt" className="text-sm uppercase tracking-widest hover:text-gold transition-colors">Kontakt</a>
            </div>
            <a
              href="#boka"
              className="bg-gold hover:bg-gold-light text-charcoal px-6 py-2 text-sm uppercase tracking-widest font-bold transition-colors"
            >
              Boka tid
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center">
        <div className="absolute inset-0">
          <Image
            src="/demos/barber/nathon-oski-fE42nRlBcG8-unsplash.jpg"
            alt="Barbershop"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/50 to-charcoal"></div>
        </div>
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <p className="text-gold uppercase tracking-[0.3em] text-sm mb-4">Sedan 1952</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-5xl md:text-7xl lg:text-8xl mb-6 leading-tight">
            Traditionell<br />Barberkonst
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto font-light">
            Upplev äkta hantverk i en avslappnad miljö. Vi kombinerar klassiska tekniker med modern stil.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#boka"
              className="bg-gold hover:bg-gold-light text-charcoal px-10 py-4 text-sm uppercase tracking-widest font-bold transition-colors"
            >
              Boka din tid
            </a>
            <a
              href="#tjanster"
              className="border border-white/30 hover:border-gold hover:text-gold px-10 py-4 text-sm uppercase tracking-widest transition-colors"
            >
              Våra tjänster
            </a>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Services Section */}
      <section id="tjanster" className="py-24 bg-charcoal-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-gold uppercase tracking-[0.3em] text-sm mb-4">Vårt utbud</p>
            <h2 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl">Tjänster & Priser</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: "Herrklippning", price: "350 kr", desc: "Klassisk klippning med konsultation, tvätt och styling", time: "45 min" },
              { name: "Skägg & Kontur", price: "200 kr", desc: "Trimning, formning och vård av skägg", time: "30 min" },
              { name: "Klippning + Skägg", price: "500 kr", desc: "Komplett paket med klippning och skäggvård", time: "60 min" },
              { name: "Rakning", price: "250 kr", desc: "Traditionell rakning med varma handdukar", time: "30 min" },
              { name: "Barn (under 12)", price: "250 kr", desc: "Klippning för de yngre herrarna", time: "30 min" },
              { name: "Senior (65+)", price: "300 kr", desc: "Herrklippning med seniorrabatt", time: "45 min" },
            ].map((service, idx) => (
              <div key={idx} className="bg-charcoal p-8 border border-gold/20 hover:border-gold/50 transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-[family-name:var(--font-playfair)] text-xl">{service.name}</h3>
                  <span className="text-gold font-bold text-lg">{service.price}</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">{service.desc}</p>
                <p className="text-gold/60 text-xs uppercase tracking-wider">{service.time}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galleri" className="py-24 bg-charcoal">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-gold uppercase tracking-[0.3em] text-sm mb-4">Vårt arbete</p>
            <h2 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl">Galleri</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="relative aspect-square overflow-hidden group">
              <Image
                src="/demos/barber/agustin-fernandez-1Pmp9uxK8X8-unsplash.jpg"
                alt="Barber work"
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/20 transition-colors duration-300"></div>
            </div>
            <div className="relative aspect-square overflow-hidden group">
              <Image
                src="/demos/barber/andrea-donato-MNu0n-3BIKs-unsplash.jpg"
                alt="Barber work"
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/20 transition-colors duration-300"></div>
            </div>
            <div className="relative aspect-square overflow-hidden group">
              <Image
                src="/demos/barber/hai-phung-m4Pd_e-4zKs-unsplash.jpg"
                alt="Barber work"
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/20 transition-colors duration-300"></div>
            </div>
            <div className="relative aspect-square overflow-hidden group md:col-span-2">
              <Image
                src="/demos/barber/nathon-oski-EW_rqoSdDes-unsplash.jpg"
                alt="Barber work"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/20 transition-colors duration-300"></div>
            </div>
            <div className="relative aspect-square overflow-hidden group">
              <Image
                src="/demos/barber/nathon-oski-fE42nRlBcG8-unsplash.jpg"
                alt="Barber work"
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/20 transition-colors duration-300"></div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="om-oss" className="py-24 bg-charcoal-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-[500px]">
              <Image
                src="/demos/barber/andrea-donato-MNu0n-3BIKs-unsplash.jpg"
                alt="Om oss"
                fill
                className="object-cover"
              />
              <div className="absolute -bottom-6 -right-6 bg-gold p-8 hidden md:block">
                <p className="font-[family-name:var(--font-playfair)] text-charcoal text-4xl font-bold">70+</p>
                <p className="text-charcoal text-sm uppercase tracking-wider">År av erfarenhet</p>
              </div>
            </div>
            <div>
              <p className="text-gold uppercase tracking-[0.3em] text-sm mb-4">Vår historia</p>
              <h2 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl mb-6">Om Klassisk Barbershop</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Sedan 1952 har vi förfinat konsten att klippa hår. Det som började som en liten salong på hörnet har vuxit till stadens mest uppskattade barbershop, känd för kvalitet och tradition.
              </p>
              <p className="text-gray-300 mb-8 leading-relaxed">
                Vårt team av erfarna barberare kombinerar tidlösa tekniker med moderna trender. Varje besök hos oss är mer än en klippning – det är en upplevelse där du kan slappna av med en kopp kaffe medan vi tar hand om din stil.
              </p>
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <p className="font-[family-name:var(--font-playfair)] text-3xl text-gold">15k+</p>
                  <p className="text-gray-400 text-sm">Nöjda kunder</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-playfair)] text-3xl text-gold">5</p>
                  <p className="text-gray-400 text-sm">Barberare</p>
                </div>
                <div>
                  <p className="font-[family-name:var(--font-playfair)] text-3xl text-gold">4.9</p>
                  <p className="text-gray-400 text-sm">Snittbetyg</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Booking CTA Section */}
      <section id="boka" className="py-24 bg-charcoal relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image
            src="/hai-phung-m4Pd_e-4zKs-unsplash.jpg"
            alt="Background"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-gold uppercase tracking-[0.3em] text-sm mb-4">Redo för förändring?</p>
          <h2 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl mb-6">Boka din tid idag</h2>
          <p className="text-gray-300 mb-10 leading-relaxed">
            Ring oss eller boka enkelt online. Vi ser fram emot att välkomna dig till vår salong.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+46812345678"
              className="bg-gold hover:bg-gold-light text-charcoal px-10 py-4 text-sm uppercase tracking-widest font-bold transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              08-123 456 78
            </a>
            <a
              href="#"
              className="border border-gold text-gold hover:bg-gold hover:text-charcoal px-10 py-4 text-sm uppercase tracking-widest font-bold transition-colors"
            >
              Boka online
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="kontakt" className="py-24 bg-charcoal-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <p className="text-gold uppercase tracking-[0.3em] text-sm mb-4">Hitta oss</p>
              <h2 className="font-[family-name:var(--font-playfair)] text-4xl md:text-5xl mb-8">Kontakt</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Adress</h3>
                    <p className="text-gray-400">Storgatan 123<br />111 22 Stockholm</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">Öppettider</h3>
                    <p className="text-gray-400">
                      Mån-Fre: 09:00 - 19:00<br />
                      Lör: 09:00 - 17:00<br />
                      Sön: Stängt
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">E-post</h3>
                    <p className="text-gray-400">info@intenzze.com</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-charcoal p-8 border border-gold/20">
              <h3 className="font-[family-name:var(--font-playfair)] text-2xl mb-6">Skicka ett meddelande</h3>
              <form className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Ditt namn"
                    className="w-full bg-charcoal-light border border-gold/20 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="E-postadress"
                    className="w-full bg-charcoal-light border border-gold/20 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <textarea
                    rows={4}
                    placeholder="Ditt meddelande"
                    className="w-full bg-charcoal-light border border-gold/20 px-4 py-3 text-white placeholder-gray-500 focus:border-gold focus:outline-none transition-colors resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gold hover:bg-gold-light text-charcoal px-6 py-4 text-sm uppercase tracking-widest font-bold transition-colors"
                >
                  Skicka meddelande
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-charcoal border-t border-gold/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <a href="#" className="font-[family-name:var(--font-playfair)] text-2xl text-gold tracking-wide">
              KLASSISK
            </a>
            <div className="flex gap-6">
              <span className="w-10 h-10 border border-gold/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </span>
              <a href="https://www.instagram.com/intenzzewebbstudio" target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-gold/30 flex items-center justify-center hover:bg-gold hover:border-gold group transition-colors">
                <svg className="w-5 h-5 text-gold group-hover:text-charcoal transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://www.facebook.com/intenzzeweb" target="_blank" rel="noopener noreferrer" className="w-10 h-10 border border-gold/30 flex items-center justify-center hover:bg-gold hover:border-gold group transition-colors">
                <svg className="w-5 h-5 text-gold group-hover:text-charcoal transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/>
                </svg>
              </a>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-500 text-sm">
                © 2024 Klassisk Barbershop. Alla rättigheter förbehållna.
              </p>
              <p className="text-gray-500 text-sm">
                Design & development by <a href="https://www.intenzze.com" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors">Intenzze</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
