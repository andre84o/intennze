// Fil: components/Navigation.tsx
"use client";

import { useState, useEffect } from "react";
import { Menu, X, Search, Calendar, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCMSStore } from "../../lib/cms-store";
import Link from "next/link";
import Image from "next/image";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { content } = useCMSStore();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Hem", href: "#" },
    { label: "Behandlingar", href: "#services" },
    { label: "Om oss", href: "#about" },
    { label: "Recensioner", href: "#testimonials" },
    { label: "Kontakt", href: "#contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "bg-white/95 backdrop-blur-md shadow-sm" : "bg-transparent"
      } h-16 md:h-20`} // ✅ Låser headerns höjd så den inte påverkas av en större logga
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-16 2xl:px-24 h-full xl:mx-0 xl:max-w-none">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link
            href="/"
            className="relative flex items-center h-full w-[200px]" // ✅ Ger loggan en “plats” men låter bilden sticka ut
          >
            <Image
              src="/demos/clinic/lumiere.png"
              alt={content.siteName}
              width={240}
              height={240}
              className={`absolute left-0 top-1/2 -translate-y-1/2 w-auto ${
                isScrolled ? "h-20 md:h-24" : "h-24 md:h-28"
              }`} // ✅ Gör loggan större utan att headern blir högre
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-700 hover:text-primary transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <button className="p-2 hover:bg-secondary/50 rounded-full transition-colors">
              <Search className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Admin
            </Link>
            <a
              href="#contact"
              className="hidden sm:flex items-center gap-2 btn-primary text-sm"
            >
              <Calendar className="w-4 h-4" />
              Boka tid
            </a>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-secondary/50 rounded-full transition-colors"
            >
              {isOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-2 text-lg font-medium text-gray-700 hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#contact"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 btn-primary w-full mt-4"
              >
                <Calendar className="w-4 h-4" />
                Boka tid
              </a>
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
