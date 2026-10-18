import React from 'react';
import { useLanguage } from '../LanguageContext';
import { format } from 'date-fns';
import { Clock, CheckCircle2, Image, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function SubmissionCard({ submission, onClick, index }) {
  const { t, isRTL } = useLanguage();
  const completionRate = submission.total_tasks > 0 ? Math.round((submission.completed_count / submission.total_tasks) * 100) : 0;
  const photoCount = submission.completed_tasks?.filter(t => t.photo_url).length || 0;
  const Arrow = isRTL ? ChevronLeft : ChevronRight;

  return (
    <motion.button 
      className="w-full text-left p-4 rounded-2xl bg-white border-2 border-[#E8E0D8] hover:border-[#7ABC98]/50 hover:shadow-md transition-all"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse text-right")}>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-xl text-xs font-medium bg-[#2A3D5A] text-white">{t(submission.work_area)}</span>
            <span className="px-3 py-1 rounded-xl text-xs font-medium bg-[#FFF8F0] text-[#2A3D5A]/70">{t(submission.shift_type)}</span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-[#2A3D5A]/50">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(submission.date), 'MMM d')}</span>
              {submission.submission_time && <span className="text-[#2A3D5A]/30">{format(new Date(submission.submission_time), 'HH:mm')}</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className={cn("h-4 w-4", completionRate === 100 ? "text-[#7ABC98]" : "text-[#2A3D5A]/30")} />
              <span className={completionRate === 100 ? "text-[#7ABC98] font-medium" : ""}>{submission.completed_count}/{submission.total_tasks}</span>
            </div>
            {photoCount > 0 && (
              <div className="flex items-center gap-1.5 text-[#7A90E9]">
                <Image className="h-4 w-4" />
                <span>{photoCount}</span>
              </div>
            )}
          </div>
        </div>
        <Arrow className="h-5 w-5 text-[#E8E0D8]" />
      </div>
    </motion.button>
  );
}