import Link from "next/link";
import type { Metadata } from "next";
import DemoNavbar from "./components/DemoNavbar";
import DemoFooter from "./components/DemoFooter";


export async function generateMetadata(): Promise<Metadata> {
  return { title: "Construction Company — Demo", robots: { index: false, follow: false } };
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <DemoNavbar />

      {/* Hero Section */}
      <section className="relative pt-16 min-h-[90vh] flex items-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f59e0b' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                Över 20 års erfarenhet
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Professionell <span className="text-amber-500">renovering</span> i Stockholm
              </h1>
              <p className="text-xl text-slate-300 mb-8 max-w-lg">
                Vi förvandlar ditt hem med kvalitetsarbete och personlig service.
                Från badrum till totalrenovering - vi levererar resultat du kan lita på.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/demos/bygg/kontakt" className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Begär gratis offert
                </Link>
                <a href="tel:+46701234567" className="inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:border-amber-500 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  070-123 45 67
                </a>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-amber-500/20 rounded-3xl blur-2xl"></div>
                <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-8 shadow-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-600/50 rounded-xl p-6 text-center">
                      <div className="text-4xl font-bold text-amber-500">500+</div>
                      <div className="text-slate-300 text-sm mt-1">Avslutade projekt</div>
                    </div>
                    <div className="bg-slate-600/50 rounded-xl p-6 text-center">
                      <div className="text-4xl font-bold text-amber-500">20+</div>
                      <div className="text-slate-300 text-sm mt-1">År i branschen</div>
                    </div>
                    <div className="bg-slate-600/50 rounded-xl p-6 text-center">
                      <div className="text-4xl font-bold text-amber-500">98%</div>
                      <div className="text-slate-300 text-sm mt-1">Nöjda kunder</div>
                    </div>
                    <div className="bg-slate-600/50 rounded-xl p-6 text-center">
                      <div className="text-4xl font-bold text-amber-500">10</div>
                      <div className="text-slate-300 text-sm mt-1">År garanti</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Services Overview */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Våra tjänster</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Vi erbjuder ett komplett utbud av renoverings- och byggtjänster
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow group">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-colors">
                <svg className="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Badrumsrenovering</h3>
              <p className="text-slate-600 mb-4">
                Komplett badrumsrenovering med tätskikt, kakel och moderna installationer.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow group">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-colors">
                <svg className="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Köksrenovering</h3>
              <p className="text-slate-600 mb-4">
                Moderna kök med smart förvaring och stilren design.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow group">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-colors">
                <svg className="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Totalrenovering</h3>
              <p className="text-slate-600 mb-4">
                Helhetslösningar för hela bostaden, nyckelfärdigt.
              </p>
            </div>
          </div>
          <div className="text-center mt-12">
            <Link
              href="/demos/bygg/tjanster"
              className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold text-lg transition-colors"
            >
              Se alla våra tjänster
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-amber-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Redo att förverkliga ditt drömhem?</h2>
          <p className="text-amber-100 text-lg mb-8 max-w-2xl mx-auto">
            Kontakta oss idag för en kostnadsfri offert. Vi återkommer inom 24 timmar.
          </p>
          <Link
            href="/demos/bygg/kontakt"
            className="inline-flex items-center gap-2 bg-white text-amber-600 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-slate-100 transition-colors"
          >
            Begär gratis offert
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      <DemoFooter />
    </div>
  );
}
