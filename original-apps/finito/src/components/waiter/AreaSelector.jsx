import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, Wine, Users, ChefHat, ClipboardCheck, ArrowRight, ArrowLeft, Sunrise, Sunset } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

export default function AreaSelector({ onSelect }) {
  const { t, isRTL } = useLanguage();
  const [workArea, setWorkArea] = useState(null);
  const [checklistType, setChecklistType] = useState('opening');
  
  // Determine message based on time
  const currentHour = new Date().getHours();
  const isOpeningTime = currentHour >= 8 && currentHour < 19;
  const greetingMessage = isOpeningTime ? t('readyToOpen') : t('readyToClose');

  const areas = [
    { id: 'floor', icon: UtensilsCrossed },
    { id: 'bar', icon: Wine },
    { id: 'host', icon: Users },
    { id: 'kitchen', icon: ChefHat },
    { id: 'cleaning', icon: ClipboardCheck },
  ];

  const checklists = [
    { id: 'opening', label: t('opening'), icon: Sunrise },
    { id: 'closing', label: t('closing'), icon: Sunset },
  ];

  const getShiftDate = (type) => {
    const now = new Date();
    const hour = now.getHours();
    // Closing shift done after midnight (00:00-04:00) belongs to the previous day
    if (type === 'closing' && hour >= 0 && hour < 4) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return format(yesterday, 'yyyy-MM-dd');
    }
    return format(now, 'yyyy-MM-dd');
  };

  const handleStart = () => {
    if (workArea && checklistType) {
      onSelect({ workArea, checklistType, date: getShiftDate(checklistType) });
    }
  };

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <motion.div 
      className="space-y-8 max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.h1 
          className="text-3xl font-semibold text-[#2A3D5A]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {greetingMessage}
        </motion.h1>
      </div>

      {/* Today's Date */}
      <div className="text-center">
        <p className="text-sm text-[#2A3D5A]/40">
          {t('today')} · {format(new Date(), 'MMM d')}
        </p>
      </div>

      {/* Checklist Type Selection */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-[#2A3D5A]/60 text-center">{t('checklistType')}</p>
        
        <div className="flex gap-3">
          {checklists.map((checklist) => {
            const isSelected = checklistType === checklist.id;
            const Icon = checklist.icon;
            return (
              <motion.button
                key={checklist.id}
                onClick={() => setChecklistType(checklist.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex-1 py-4 px-4 rounded-2xl border-2 transition-all duration-300 font-medium flex items-center justify-center gap-2",
                  isSelected 
                    ? "bg-[#7ABC98] border-[#7ABC98] text-white shadow-lg shadow-[#7ABC98]/20" 
                    : "bg-white border-[#E8E0D8] text-[#2A3D5A]/60 hover:border-[#7ABC98]/50"
                )}
              >
                <Icon className="h-5 w-5" />
                {checklist.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Area Selection */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-[#2A3D5A]/60 text-center">{t('selectArea')}</p>
        
        <div className="grid grid-cols-2 gap-4">
          {areas.slice(0, 4).map((area, index) => {
            const Icon = area.icon;
            const isSelected = workArea === area.id;
            return (
              <motion.button
                key={area.id}
                onClick={() => setWorkArea(area.id)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative p-6 rounded-3xl border-2 transition-all duration-300",
                  "flex flex-col items-center gap-4 shadow-sm",
                  isSelected 
                    ? "bg-[#2A3D5A] border-[#2A3D5A] shadow-xl shadow-[#2A3D5A]/20" 
                    : "bg-white border-[#E8E0D8] hover:border-[#7ABC98] hover:shadow-md"
                )}
              >
                <div className={cn(
                  "p-4 rounded-2xl transition-all duration-300",
                  isSelected ? "bg-white/20" : "bg-[#FFF8F0]"
                )}>
                  <Icon className={cn(
                    "h-8 w-8 transition-colors duration-300",
                    isSelected ? "text-white" : "text-[#2A3D5A]"
                  )} strokeWidth={1.5} />
                </div>
                <span className={cn(
                  "font-semibold text-base transition-colors duration-300",
                  isSelected ? "text-white" : "text-[#2A3D5A]"
                )}>
                  {t(area.id)}
                </span>
              </motion.button>
            );
          })}
        </div>
        {/* Cleaning - full width centered */}
        {(() => {
          const area = areas[4];
          const Icon = area.icon;
          const isSelected = workArea === area.id;
          return (
            <motion.button
              key={area.id}
              onClick={() => setWorkArea(area.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "w-full p-5 rounded-3xl border-2 transition-all duration-300",
                "flex items-center justify-center gap-5 shadow-sm",
                isSelected 
                  ? "bg-[#2A3D5A] border-[#2A3D5A] shadow-xl shadow-[#2A3D5A]/20" 
                  : "bg-white border-[#E8E0D8] hover:border-[#7ABC98] hover:shadow-md"
              )}
            >
              <div className={cn(
                "p-3 rounded-2xl transition-all duration-300",
                isSelected ? "bg-white/20" : "bg-[#FFF8F0]"
              )}>
                <Icon className={cn(
                  "h-7 w-7 transition-colors duration-300",
                  isSelected ? "text-white" : "text-[#2A3D5A]"
                )} strokeWidth={1.5} />
              </div>
              <span className={cn(
                "font-semibold text-lg transition-colors duration-300",
                isSelected ? "text-white" : "text-[#2A3D5A]"
              )}>
                {t(area.id)}
              </span>
            </motion.button>
          );
        })()}
      </div>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={handleStart}
          disabled={!workArea || !checklistType}
          className={cn(
            "w-full h-14 text-lg font-semibold rounded-2xl shadow-lg transition-all duration-300",
            (workArea && checklistType)
              ? "bg-[#7ABC98] hover:bg-[#6aac88] text-white shadow-[#7ABC98]/30" 
              : "bg-[#E8E0D8] text-[#2A3D5A]/40"
          )}
        >
          {t('startChecklist')}
          <Arrow className={cn("h-5 w-5", isRTL ? "mr-2" : "ml-2")} />
        </Button>
      </motion.div>
    </motion.div>
  );
}