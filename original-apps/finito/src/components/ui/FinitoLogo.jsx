import React from 'react';
import { motion } from 'framer-motion';

export default function FinitoLogo({ size = 'default', variant = 'full', dark = false }) {
  const sizes = {
    small: { icon: 'h-8 w-8', text: 'text-lg' },
    default: { icon: 'h-10 w-10', text: 'text-xl' },
    large: { icon: 'h-14 w-14', text: 'text-3xl' },
    xl: { icon: 'h-20 w-20', text: 'text-4xl' }
  };

  const s = sizes[size] || sizes.default;
  const textColor = dark ? 'text-white' : 'text-[#2A3D5A]';

  if (variant === 'icon') {
    return (
      <motion.div 
        className={`${s.icon} rounded-2xl bg-gradient-to-br from-[#2A3D5A] to-[#1e2d42] shadow-lg flex items-center justify-center p-2`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <motion.div 
        className={`${s.icon} rounded-2xl bg-gradient-to-br from-[#2A3D5A] to-[#1e2d42] shadow-lg flex items-center justify-center overflow-hidden`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>
      {variant === 'full' && (
        <span className={`${s.text} font-semibold tracking-tight ${textColor}`}>
          Finito
        </span>
      )}
    </div>
  );
}