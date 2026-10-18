import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';

export default function StorySection() {
  const { t, isRTL } = useLanguage();

  const sections = [
    {
      titleKey: 'ourStory',
      textKey: 'storyText',
      image: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=600'
    },
    {
      titleKey: 'whatIsJapanese',
      textKey: 'japaneseText',
      image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600'
    },
    {
      titleKey: 'whatMakesSpecial',
      textKey: 'specialText',
      image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=600'
    }
  ];

  return (
    <section className={`py-24 bg-gray-50 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-6xl mx-auto px-6">
        {sections.map((section, index) => (
          <motion.div
            key={section.titleKey}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`flex flex-col md:flex-row items-center gap-12 mb-24 last:mb-0 ${
              index % 2 === 1 ? 'md:flex-row-reverse' : ''
            }`}
          >
            <div className="flex-1">
              <div className="relative">
                <div className="absolute -inset-4 bg-red-600/10 rounded-lg transform rotate-3" />
                <img
                  src={section.image}
                  alt={t(section.titleKey)}
                  className="relative w-full h-64 md:h-80 object-cover rounded-lg shadow-xl"
                />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <h3 className="text-3xl font-light text-gray-900">{t(section.titleKey)}</h3>
              <div className="w-16 h-1 bg-red-600" />
              <p className="text-lg text-gray-600 leading-relaxed">{t(section.textKey)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}