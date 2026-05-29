'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import BookingModal from './BookingModal';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <>
      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)} 
        className="hidden" 
      />
      <nav className="bg-cream/95 backdrop-blur-md sticky top-0 z-50 border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="group flex items-center gap-3">
              <Image
                src="/demos/health/logo.png"
                alt="Serenity Health Center"
                width={60}
                height={60}
                className="object-contain"
              />
              <div className="flex flex-col">
                <span className="text-xl font-medium tracking-[0.2em] text-sage-800 group-hover:text-sage-600 transition-colors">
                  SERENITY
                </span>
                <span className="text-[10px] tracking-[0.3em] text-sage-600 uppercase font-medium">
                  Health Center
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-12">
            <Link
              href="/"
              className="text-sage-700 hover:text-sage-500 text-sm font-medium tracking-wider uppercase transition-colors relative group"
            >
              Hem
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/services"
              className="text-sage-700 hover:text-sage-500 text-sm font-medium tracking-wider uppercase transition-colors relative group"
            >
              Tjänster
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link
              href="/about"
              className="text-sage-700 hover:text-sage-500 text-sm font-medium tracking-wider uppercase transition-colors relative group"
            >
              Om oss
              <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold group-hover:w-full transition-all duration-300"></span>
            </Link>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="ml-4 px-4 py-2.5 bg-sage-600 border border-sage-600 text-sm text-white font-medium tracking-wider uppercase hover:bg-sage-700 transition-all duration-300 rounded-sm"
            >
              Boka tid
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-sage-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-6 border-t border-gold/10 mt-2">
            <div className="flex flex-col gap-4 pt-6">
              <Link
                href="/"
                className="text-sage-700 text-sm font-medium tracking-wider uppercase py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Hem
              </Link>
              <Link
                href="/services"
                className="text-sage-700 text-sm font-medium tracking-wider uppercase py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Tjänster
              </Link>
              <Link
                href="/about"
                className="text-sage-700 text-sm font-medium tracking-wider uppercase py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Om oss
              </Link>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsBookingOpen(true);
                }}
                className="mt-2 px-6 py-3 bg-sage-600 text-white text-sm font-medium tracking-wider uppercase text-center rounded-sm w-full"
              >
                Boka tid
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
    </>
  );
}
