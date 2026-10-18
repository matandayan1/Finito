import React from 'react';
import { useLanguage } from '../LanguageContext';
import { Button } from "@/components/ui/button";
import { CheckCircle2, RotateCcw, Image } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function SubmissionSuccess({ submission, onNewChecklist }) {
  const { t } = useLanguage();

  const completedWithPhotos = submission.completedTasks?.filter(
    task => task.completed && task.photo_url
  ) || [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto text-center space-y-8"
    >
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="flex justify-center"
      >
        <div className="h-28 w-28 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center shadow-lg border-4 border-white">
          <CheckCircle2 className="h-16 w-16 text-emerald-600" />
        </div>
      </motion.div>

      {/* Success Message */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-stone-800">{t('submissionSuccess')}</h1>
        <p className="text-stone-500">{t('thankYou')}</p>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border-2 border-stone-200 shadow-lg overflow-hidden text-left">
        <div className="p-6 space-y-4">
          <h2 className="font-semibold text-lg text-stone-800">{t('submissionSummary')}</h2>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-stone-50 rounded-xl p-3">
              <span className="text-stone-500 text-xs">{t('today')}</span>
              <p className="font-semibold text-stone-800 mt-0.5">
                {format(new Date(), 'MMM d, yyyy')}
              </p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3">
              <span className="text-stone-500 text-xs">{t('currentShift')}</span>
              <p className="font-semibold text-stone-800 mt-0.5">{t(submission.shift_type)}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3">
              <span className="text-stone-500 text-xs">{t('workArea')}</span>
              <p className="font-semibold text-stone-800 mt-0.5">{t(submission.work_area)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3">
              <span className="text-emerald-600 text-xs">{t('completedTasks')}</span>
              <p className="font-semibold text-emerald-700 mt-0.5">
                {submission.completed_count} / {submission.total_tasks}
              </p>
            </div>
          </div>

          {/* Photo Thumbnails */}
          {completedWithPhotos.length > 0 && (
            <div className="pt-4 border-t border-stone-100">
              <div className="flex items-center gap-2 mb-3">
                <Image className="h-4 w-4 text-stone-400" />
                <span className="text-sm text-stone-500">
                  {completedWithPhotos.length} {t('photos')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {completedWithPhotos.slice(0, 6).map((task, index) => (
                  <img
                    key={index}
                    src={task.photo_url}
                    alt={task.task_name}
                    className="h-16 w-16 object-cover rounded-xl border-2 border-stone-200 shadow-sm"
                  />
                ))}
                {completedWithPhotos.length > 6 && (
                  <div className="h-16 w-16 rounded-xl bg-stone-100 flex items-center justify-center text-sm font-semibold text-stone-500 border-2 border-stone-200">
                    +{completedWithPhotos.length - 6}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Checklist Button */}
      <Button
        onClick={onNewChecklist}
        size="lg"
        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-stone-800 to-stone-900 hover:from-stone-700 hover:to-stone-800 rounded-2xl shadow-lg"
      >
        <RotateCcw className="h-5 w-5 mr-2" />
        {t('newChecklist')}
      </Button>
    </motion.div>
  );
}