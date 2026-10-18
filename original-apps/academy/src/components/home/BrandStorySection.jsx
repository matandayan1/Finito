import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';

export default function BrandStorySection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className={`py-12 sm:py-20 md:py-32 bg-white ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* About Kimura-ya */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 sm:mb-24"
        >
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-gray-900 mb-4 px-2">
              {t('aboutKimuraya')}
            </h2>
            <div className="w-16 sm:w-20 h-1 bg-red-600 mx-auto" />
          </div>
          <p className={`text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('aboutKimurayaText')}
          </p>
        </motion.div>

        {/* Culinary Philosophy with exterior image */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center mb-16 sm:mb-24"
        >
          <div className={`${isRTL ? 'md:order-2' : ''}`}>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-gray-900 mb-4 px-2">
              {t('culinaryPhilosophy')}
            </h2>
            <div className="w-16 sm:w-20 h-1 bg-red-600 mb-4 sm:mb-6" />
            <p className={`text-base sm:text-lg text-gray-700 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('culinaryPhilosophyText')}
            </p>
          </div>
          <div className={`${isRTL ? 'md:order-1' : ''}`}>
            <div className="relative">
              <div className="absolute -inset-2 sm:-inset-4 bg-red-600/5 rounded-lg" />
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693226ea1a79b292450150b9/92b833bbf_2-b7528e18.jpg"
                alt="Kimura-Ya Exterior"
                className="relative w-full h-48 sm:h-64 md:h-96 object-cover rounded-lg shadow-xl"
              />
            </div>
          </div>
        </motion.div>

        {/* Join Our Journey */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center bg-gradient-to-br from-amber-50 to-orange-50 rounded-sm p-6 sm:p-12 md:p-16 border border-amber-100"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-gray-900 mb-4 px-2">
            {t('joinOurJourney')}
          </h2>
          <div className="w-16 sm:w-20 h-1 bg-red-600 mx-auto mb-4 sm:mb-6" />
          <p className={`text-base sm:text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('joinOurJourneyText')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}