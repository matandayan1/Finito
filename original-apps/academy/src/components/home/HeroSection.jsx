import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';
import { Button } from "@/components/ui/button";
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HeroSection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Real restaurant interior image */}
      <div className="absolute inset-0">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693226ea1a79b292450150b9/5bc6e273d_1-b7528e18.jpg"
          alt="Kimura-Ya Restaurant Interior"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mb-6 sm:mb-8"
        >
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693226ea1a79b292450150b9/226b16a44_WhatsAppImage2025-12-19at145135.jpeg"
            alt="Kimura-Ya"
            className="h-24 sm:h-32 md:h-40 w-auto mx-auto drop-shadow-2xl mb-3 sm:mb-4"
          />
          <p className="text-base sm:text-xl md:text-2xl text-white/90 tracking-[0.2em] sm:tracking-[0.3em] font-light">
            KIMURA-YA
          </p>
        </motion.div>

        {/* Welcome text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="space-y-4 sm:space-y-6 mb-8 sm:mb-12"
        >
          <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white font-light leading-relaxed px-2 ${isRTL ? 'font-hebrew' : ''}`}>
            {t('welcomeToKimuraya')}
          </h1>
          <div className="inline-block px-4 sm:px-6 py-2 bg-red-600/80 backdrop-blur rounded-full">
            <p className="text-xs sm:text-sm md:text-base tracking-wide text-white font-medium">
              {t('staffTrainingAcademy')}
            </p>
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link to={createPageUrl('Menu')}>
            <Button 
              size="lg"
              className="bg-white/10 backdrop-blur hover:bg-white/20 text-white px-6 sm:px-10 py-5 sm:py-7 text-base sm:text-lg border border-white/30 hover:border-white/50 transition-all duration-300 rounded-sm"
            >
              {t('startLearning')}
            </Button>
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronDown className="w-8 h-8 text-white/60" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}