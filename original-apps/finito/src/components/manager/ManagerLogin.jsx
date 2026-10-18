import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import FinitoLogo from '../ui/FinitoLogo';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

const MANAGER_PASSWORD = "manager123";

export default function ManagerLogin({ onLogin }) {
  const { t, isRTL } = useLanguage();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === MANAGER_PASSWORD) {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <motion.div 
      className="min-h-[70vh] flex items-center justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <FinitoLogo size="large" variant="icon" />
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-semibold text-[#2A3D5A]">{t('managerMode')}</h2>
            <p className="text-[#2A3D5A]/50 text-sm">{t('enterPassword')}</p>
          </div>

          {/* Password Input */}
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('enterPassword')}
              className={cn(
                "h-14 text-lg rounded-2xl border-2 px-5 bg-white",
                isRTL ? "pr-5 pl-14" : "pl-5 pr-14",
                error ? "border-red-300 bg-red-50" : "border-[#E8E0D8] focus:border-[#7ABC98]"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 p-2 text-[#2A3D5A]/40 hover:text-[#2A3D5A]/60 transition-colors",
                isRTL ? "left-3" : "right-3"
              )}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: error ? 1 : 0, height: error ? 'auto' : 0 }}
            className="flex items-center justify-center gap-2 text-red-500 text-sm"
          >
            <AlertCircle className="h-4 w-4" />
            {t('incorrectPassword')}
          </motion.div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-14 text-lg font-semibold rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42] shadow-lg transition-all duration-200"
          >
            {t('login')}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}