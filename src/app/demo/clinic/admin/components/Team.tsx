'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useCMSStore } from '../../lib/cms-store';

export default function Team() {
  const { content } = useCMSStore();

  return (
    <section className="section-padding bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="heading-lg text-gray-900 mb-4">{content.teamTitle}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {content.teamSubtitle}
          </p>
        </motion.div>

        {/* Team Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {content.team.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group text-center"
            >
              {/* Image */}
              <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors duration-300" />
              </div>

              {/* Info */}
              <h3 className="text-xl font-serif font-medium text-gray-900 mb-1">
                {member.name}
              </h3>
              <p className="text-primary font-medium text-sm mb-3">{member.role}</p>
              <p className="text-gray-600 text-sm max-w-xs mx-auto">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
