import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';
import { Crosshair, Leaf, Scale, Sparkles, Heart } from 'lucide-react';

export default function PhilosophySection() {
  const { t, isRTL } = useLanguage();

  const principles = [
    { icon: Crosshair, key: 'precision', color: 'text-red-500', bgColor: 'bg-red-500/10' },
    { icon: Leaf, key: 'freshness', color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { icon: Scale, key: 'balance', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { icon: Sparkles, key: 'umami', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { icon: Heart, key: 'respect', color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  ];

  return (
    <section className={`py-24 bg-white ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
            {t('philosophy')}
          </h2>
          <div className="w-24 h-1 bg-red-600 mx-auto" />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {principles.map((principle, index) => (
            <motion.div
              key={principle.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className={`w-20 h-20 rounded-full ${principle.bgColor} flex items-center justify-center mb-4 transition-transform hover:scale-110`}>
                <principle.icon className={`w-10 h-10 ${principle.color}`} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">{t(principle.key)}</h3>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}