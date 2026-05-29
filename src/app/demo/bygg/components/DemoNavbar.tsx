"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DemoNavbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/demos/bygg" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-800">ByggProff</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/demos/bygg/tjanster"
              className={`transition-colors ${isActive('/demos/bygg/tjanster') ? 'text-amber-500 font-medium' : 'text-slate-600 hover:text-amber-500'}`}
            >
              Tjänster
            </Link>
            <Link
              href="/demos/bygg/om-oss"
              className={`transition-colors ${isActive('/demos/bygg/om-oss') ? 'text-amber-500 font-medium' : 'text-slate-600 hover:text-amber-500'}`}
            >
              Om oss
            </Link>
            <Link
              href="/demos/bygg/projekt"
              className={`transition-colors ${isActive('/demos/bygg/projekt') ? 'text-amber-500 font-medium' : 'text-slate-600 hover:text-amber-500'}`}
            >
              Projekt
            </Link>
            <Link
              href="/demos/bygg/kontakt"
              className={`transition-colors ${isActive('/demos/bygg/kontakt') ? 'text-amber-500 font-medium' : 'text-slate-600 hover:text-amber-500'}`}
            >
              Kontakt
            </Link>
          </div>
          <Link href="/demos/bygg/kontakt" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">
            Gratis offert
          </Link>
        </div>
      </div>
    </nav>
  );
}
