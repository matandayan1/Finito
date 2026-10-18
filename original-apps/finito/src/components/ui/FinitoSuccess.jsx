import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

export default function FinitoSuccess({ onComplete }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => onComplete?.(), 2500)
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#FFF8F0] to-[#F5EDE6]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center relative">
        {/* Checkmark Animation */}
        <motion.div
          className="mx-auto mb-8 h-32 w-32 rounded-full bg-gradient-to-br from-[#2A3D5A] to-[#1e2d42] flex items-center justify-center shadow-2xl"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <motion.svg 
            viewBox="0 0 24 24" 
            className="w-16 h-16" 
            fill="none" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <motion.polyline
              points="20 6 9 17 4 12"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            />
          </motion.svg>
        </motion.div>

        {/* Finito! Text */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.h1
              className="text-5xl font-bold text-[#2A3D5A] mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              Finito!
            </motion.h1>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase >= 2 && (
            <motion.p
              className="text-lg text-[#7A90E9]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {t('finitoMessage')}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Sparkles */}
        {phase >= 1 && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full"
                style={{ 
                  background: i % 2 === 0 ? '#7ABC98' : '#7A90E9',
                  left: '50%',
                  top: '30%'
                }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{ 
                  opacity: [0, 1, 0],
                  x: Math.cos(i * 45 * Math.PI / 180) * 120,
                  y: Math.sin(i * 45 * Math.PI / 180) * 120,
                  scale: [0, 1.2, 0]
                }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
              />
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}