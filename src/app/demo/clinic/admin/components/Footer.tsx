'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, MapPin, Phone, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { useCMSStore } from '../../lib/cms-store';

export default function Footer() {
  const { content } = useCMSStore();

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram className="w-5 h-5" />;
      case 'facebook':
        return <Facebook className="w-5 h-5" />;
      case 'x':
        return <Image src="/demos/clinic/logo-black.png" alt="X" width={20} height={20} className="w-5 h-5 invert" />;
      default:
        return null;
    }
  };

  return (
    <footer className="relative overflow-hidden">
      {/* CTA Section */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-purple-900">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-8 xl:px-16 2xl:px-24 py-16 xl:mx-0 xl:max-w-none">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-200" />
                <span className="text-purple-200 text-sm font-medium uppercase tracking-wider">Börja din resa</span>
              </div>
              <h3 className="text-3xl md:text-4xl font-serif text-white mb-2">
                Redo att stråla?
              </h3>
              <p className="text-white/80 max-w-md">
                Boka din kostnadsfria konsultation idag och upptäck behandlingen som passar just dig.
              </p>
            </div>
            <a
              href="#contact"
              className="group flex items-center gap-3 bg-white text-primary px-8 py-4 rounded-full font-medium hover:bg-gray-50 transition-all hover:scale-105 shadow-lg"
            >
              Boka konsultation
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="bg-gray-900 text-white relative">
        {/* Decorative top curve */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-16 2xl:px-24 py-16 xl:mx-0 xl:max-w-none">
          <div className="grid md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
            {/* Brand - larger column */}
            <div className="lg:col-span-4">
              <Link href="/" className="inline-block">
                <Image
                  src="/demos/clinic/lumiere.png"
                  alt={content.siteName}
                  width={140}
                  height={50}
                  className="h-12 w-auto brightness-0 invert"
                />
              </Link>
              <p className="mt-4 text-gray-400 leading-relaxed">
                {content.siteTagline}. Din destination för professionell hudvård och välmående.
              </p>

              {/* Social Links with labels */}
              <div className="mt-6">
                <p className="text-sm text-gray-500 mb-3">Följ oss</p>
                <div className="flex gap-3">
                  {content.socialLinks.map((link) => {
                    const isX = link.platform.toLowerCase() === 'x';

                    if (isX) {
                      return (
                        <div
                          key={link.platform}
                          role="img"
                          aria-label="X"
                          className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center"
                        >
                          {getSocialIcon(link.platform)}
                        </div>
                      );
                    }

                    return (
                      <a
                        key={link.platform}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300"
                      >
                        {getSocialIcon(link.platform)}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2">
              <h4 className="font-medium text-lg mb-5 flex items-center gap-2">
                <span className="w-8 h-px bg-primary"></span>
                Navigera
              </h4>
              <ul className="space-y-3">
                {[
                  { label: 'Hem', href: '#' },
                  { label: 'Behandlingar', href: '#services' },
                  { label: 'Om oss', href: '#about' },
                  { label: 'Kontakt', href: '#contact' },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 group"
                    >
                      <span className="w-0 h-px bg-primary group-hover:w-3 transition-all duration-300"></span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div className="lg:col-span-3">
              <h4 className="font-medium text-lg mb-5 flex items-center gap-2">
                <span className="w-8 h-px bg-primary"></span>
                Behandlingar
              </h4>
              <ul className="space-y-3">
                {content.services.slice(0, 4).map((service) => (
                  <li key={service.id}>
                    <a
                      href="#services"
                      className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2 group"
                    >
                      <span className="w-0 h-px bg-primary group-hover:w-3 transition-all duration-300"></span>
                      {service.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="lg:col-span-3">
              <h4 className="font-medium text-lg mb-5 flex items-center gap-2">
                <span className="w-8 h-px bg-primary"></span>
                Kontakt
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-gray-400 text-sm pt-2">{content.address}</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <a href={`tel:${content.phone}`} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {content.phone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <a href={`mailto:${content.email}`} className="text-gray-400 hover:text-white transition-colors text-sm">
                    {content.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-16 2xl:px-24 py-6 xl:mx-0 xl:max-w-none">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <p className="text-gray-500 text-sm">{content.footerText}</p>
                <p className="text-gray-600 text-xs mt-1">
                  Design & development by{' '}
                  <a href="https://www.intenzze.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary transition-colors">
                    Intenzze
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-gray-500 hover:text-white transition-colors">
                  Integritetspolicy
                </a>
                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                <a href="#" className="text-gray-500 hover:text-white transition-colors">
                  Villkor
                </a>
                <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                <Link href="/admin" className="text-gray-500 hover:text-white transition-colors">
                  Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
