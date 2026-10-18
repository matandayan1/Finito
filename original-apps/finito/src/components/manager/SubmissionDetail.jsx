import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '../LanguageContext';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, XCircle, Image, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import ImageLightbox from '@/components/ui/ImageLightbox';

export default function SubmissionDetail({ submission, open, onClose }) {
  const { t, isRTL, getLocalizedField } = useLanguage();
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const { data: allChecklistItems = [] } = useQuery({
    queryKey: ['all-checklist-items'],
    queryFn: () => base44.entities.ChecklistItem.list('-sort_order', 500),
  });
  const taskMap = React.useMemo(() => {
    const map = {};
    allChecklistItems.forEach(item => { map[item.id] = item; });
    return map;
  }, [allChecklistItems]);

  const getTaskName = (task) => {
    const originalTask = task.task_id ? taskMap[task.task_id] : null;
    return originalTask ? (getLocalizedField(originalTask, 'name') || task.task_name) : task.task_name;
  };

  if (!submission) return null;

  const completedTasks = submission.completed_tasks?.filter(t => t.completed) || [];
  const incompleteTasks = submission.completed_tasks?.filter(t => !t.completed) || [];
  const photosOnly = completedTasks.filter(t => t.photo_url);

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-2xl max-h-[90vh] rounded-3xl border-2 border-[#E8E0D8]", isRTL && "rtl")}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#2A3D5A]">{t('submissionDetails')}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-[#FFF8F0] rounded-2xl">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#2A3D5A]/40" />
                <span className="font-medium text-[#2A3D5A]">
                  {format(new Date(submission.date), 'MMM d, yyyy')}
                  {submission.submission_time && <span className="text-[#2A3D5A]/50 ml-2">{format(new Date(submission.submission_time), 'HH:mm')}</span>}
                </span>
              </div>
              <span className="px-3 py-1 rounded-xl text-sm bg-[#2A3D5A] text-white">{t(submission.work_area)}</span>
              <span className="px-3 py-1 rounded-xl text-sm bg-white text-[#2A3D5A]/70 border border-[#E8E0D8]">{t(submission.shift_type)}</span>
            </div>

            {/* Photo Gallery */}
            {photosOnly.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-[#2A3D5A]">
                  <Image className="h-5 w-5 text-[#7A90E9]" /> {t('photos')} ({photosOnly.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {photosOnly.map((task, index) => (
                    <motion.div
                      key={index}
                      className="relative group cursor-zoom-in"
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setLightboxUrl(task.photo_url)}
                    >
                      <img src={task.photo_url} alt={getTaskName(task)} className="w-full h-28 object-cover rounded-2xl border-2 border-[#E8E0D8] group-hover:border-[#7ABC98] transition-colors shadow-sm" />
                      <div className="absolute inset-0 bg-[#2A3D5A]/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-end p-2">
                        <span className="text-white text-xs font-medium line-clamp-2">{getTaskName(task)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-[#2A3D5A]">
                  <CheckCircle2 className="h-5 w-5 text-[#7ABC98]" /> {t('completedTasks')} ({completedTasks.length})
                </h3>
                <div className="space-y-2">
                  {completedTasks.map((task, index) => (
                    <div key={index} className="p-4 bg-[#2A3D5A] text-white rounded-2xl">
                      <p className="font-medium">{getTaskName(task)}</p>
                      {task.note && (
                        <div className="flex items-start gap-2 mt-2 text-sm text-white/70">
                          <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{task.note}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incomplete Tasks */}
            {incompleteTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2 text-[#2A3D5A]/50">
                  <XCircle className="h-5 w-5" /> {t('incompleteTasks')} ({incompleteTasks.length})
                </h3>
                <div className="space-y-2">
                  {incompleteTasks.map((task, index) => (
                    <div key={index} className="p-4 bg-[#FFF8F0] rounded-2xl border border-[#E8E0D8]">
                      <p className="text-[#2A3D5A]/50">{getTaskName(task)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </>
  );
}