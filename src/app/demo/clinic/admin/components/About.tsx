'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { useCMSStore } from '../../lib/cms-store';

export default function About() {
  const { content } = useCMSStore();

  const features = [
    'Certifierade hudterapeuter',
    'Högkvalitativa produkter',
    'Personlig rådgivning',
    'Avkopplande miljö',
  ];

  return (
    <section id="about" className="section-padding bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="relative aspect-[4/5] max-w-md mx-auto lg:max-w-none">
              {/* Main Image */}
              <div className="absolute inset-0 rounded-[3rem] overflow-hidden shadow-xl">
                <Image
                  src={content.aboutImage}
                  alt="Om oss"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Decorative Frame */}
              <div className="absolute -inset-4 border-2 border-primary/20 rounded-[3.5rem] -z-10" />

              {/* Stats Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="absolute -bottom-6 -right-6 bg-white rounded-2xl p-6 shadow-xl"
              >
                <div className="grid grid-cols-2 gap-4">
                  {content.aboutStats.slice(0, 2).map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-2xl font-serif font-medium text-primary">
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-sm font-medium text-primary uppercase tracking-wider">
              Om oss
            </span>
            <h2 className="heading-lg text-gray-900 mt-2 mb-6">
              {content.aboutTitle}
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {content.aboutText}
            </p>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </motion.div>
              ))}
            </div>

            <a href="#contact" className="btn-primary inline-block">
              Läs mer om oss
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
