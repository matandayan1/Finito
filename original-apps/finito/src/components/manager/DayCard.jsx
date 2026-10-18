import React from 'react';
import { useLanguage } from '../LanguageContext';
import { format } from 'date-fns';
import { CheckCircle2, AlertCircle, Circle, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function DayCard({ date, openingData, closingData, onClick, index }) {
  const { t, isRTL } = useLanguage();
  
  const getStatus = (data) => {
    if (!data || data.length === 0) return 'not_started';
    const completed = data.filter(d => d.status === 'completed').length;
    const total = data.length;
    if (completed === total) return 'completed';
    if (completed > 0) return 'partial';
    return 'in_progress';
  };

  const openingStatus = getStatus(openingData);
  const closingStatus = getStatus(closingData);

  const statusConfig = {
    completed: { icon: CheckCircle2, color: 'text-[#7ABC98]', bg: 'bg-[#7ABC98]/10', text: t('completedTasks') },
    partial: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50', text: 'Partial' },
    in_progress: { icon: Circle, color: 'text-blue-500', bg: 'bg-blue-50', text: 'In Progress' },
    not_started: { icon: Circle, color: 'text-[#E8E0D8]', bg: 'bg-[#E8E0D8]/30', text: 'Not Started' }
  };

  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  return (
    <motion.button
      className="w-full text-left p-5 rounded-2xl bg-white border-2 border-[#E8E0D8] hover:border-[#7ABC98]/50 hover:shadow-lg transition-all"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className={cn("flex items-center justify-between gap-4", isRTL && "flex-row-reverse")}>
        <div className="flex-1 space-y-3">
          <h3 className="font-semibold text-[#2A3D5A]">{format(new Date(date), 'MMM d, yyyy')}</h3>
          
          <div className="space-y-2">
            {/* Opening Status */}
            <div className="flex items-center gap-2">
              {React.createElement(statusConfig[openingStatus].icon, {
                className: cn("h-4 w-4", statusConfig[openingStatus].color)
              })}
              <span className="text-sm font-medium text-[#2A3D5A]">{t('opening')}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-lg", statusConfig[openingStatus].bg, statusConfig[openingStatus].color)}>
                {openingData?.length || 0} {t('floor')}
              </span>
            </div>

            {/* Closing Status */}
            <div className="flex items-center gap-2">
              {React.createElement(statusConfig[closingStatus].icon, {
                className: cn("h-4 w-4", statusConfig[closingStatus].color)
              })}
              <span className="text-sm font-medium text-[#2A3D5A]">{t('closing')}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-lg", statusConfig[closingStatus].bg, statusConfig[closingStatus].color)}>
                {closingData?.length || 0} {t('floor')}
              </span>
            </div>
          </div>
        </div>
        <Arrow className="h-5 w-5 text-[#E8E0D8]" />
      </div>
    </motion.button>
  );
}