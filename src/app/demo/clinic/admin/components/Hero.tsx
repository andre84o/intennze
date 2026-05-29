'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Heart, Award } from 'lucide-react';
import { useCMSStore } from '../../lib/cms-store';

export default function Hero() {
  const { content } = useCMSStore();

  return (
    <section className="relative min-h-screen flex items-center gradient-hero overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1"
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-wider">
                {content.siteTagline}
              </span>
            </div>

            <h1 className="heading-xl text-gray-900 mb-6">
              {content.heroTitle}
            </h1>

            <p className="text-lg text-gray-600 mb-8 max-w-lg leading-relaxed">
              {content.heroSubtitle}
            </p>

            <div className="flex flex-wrap gap-4">
              <a href="#contact" className="btn-primary flex items-center gap-2">
                {content.heroCTA}
                <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#services" className="btn-secondary">
                Våra behandlingar
              </a>
            </div>

            {/* USPs */}
            <div className="mt-12 flex gap-6 flex-wrap">
              {[
                { icon: Shield, text: 'Certifierade behandlare' },
                { icon: Heart, text: 'Personlig rådgivning' },
                { icon: Award, text: 'Premiumprodukter' },
              ].map((usp, index) => (
                <motion.div
                  key={usp.text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <usp.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm text-gray-600">{usp.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="order-1 lg:order-2 relative"
          >
            <div className="relative aspect-[4/5] max-w-lg mx-auto">
              {/* Main Image */}
              <div className="absolute inset-0 rounded-[3rem] overflow-hidden shadow-2xl">
                <Image
                  src={content.heroImage}
                  alt="Skönhetsbehandling"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Floating Card */}
              {content.showHeroBadge && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="absolute -bottom-4 -left-4 bg-white rounded-2xl p-4 shadow-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{content.heroBadgeTitle}</div>
                      <div className="text-sm text-gray-500">{content.heroBadgeText}</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Decorative Elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 border-2 border-primary/30 rounded-full" />
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-accent/30 rounded-full blur-xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
