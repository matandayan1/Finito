import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';
import { Star, Eye, ListOrdered, Sparkles, MessageCircle } from 'lucide-react';

export default function ExpectationsSection() {
  const { t, isRTL } = useLanguage();

  const expectations = [
    { icon: Star, key: 'serviceQuality', color: 'bg-amber-500' },
    { icon: Eye, key: 'attention', color: 'bg-blue-500' },
    { icon: ListOrdered, key: 'dishOrder', color: 'bg-green-500' },
    { icon: Sparkles, key: 'cleanliness', color: 'bg-purple-500' },
    { icon: MessageCircle, key: 'communication', color: 'bg-red-500' },
  ];

  return (
    <section className={`py-24 bg-black text-white ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-light mb-4">
            {t('whatExpected')}
          </h2>
          <div className="w-24 h-1 bg-red-600 mx-auto" />
        </motion.div>

        <div className="grid md:grid-cols-5 gap-6">
          {expectations.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-6 text-center hover:bg-white/10 transition-all duration-300 hover:border-red-500/50 h-full">
                <div className={`w-14 h-14 ${item.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-medium">{t(item.key)}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}