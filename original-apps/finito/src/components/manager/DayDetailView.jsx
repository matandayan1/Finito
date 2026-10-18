import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '../LanguageContext';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import ImageLightbox from '@/components/ui/ImageLightbox';

// Module-level cache: survives component remounts so the expanded section
// and scroll position are preserved when opening/closing the lightbox.
const viewCache = { expandedArea: null, scrollY: 0, shouldRestoreScroll: false };

export default function DayDetailView({ date, dayData, onBack }) {
  const { t, isRTL, getLocalizedField } = useLanguage();
  const [expandedArea, setExpandedArea] = useState(viewCache.expandedArea);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Clear cache when navigating to a different day
  const prevDateRef = useRef(date);
  useEffect(() => {
    if (prevDateRef.current !== date) {
      viewCache.expandedArea = null;
      viewCache.scrollY = 0;
      viewCache.shouldRestoreScroll = false;
      setExpandedArea(null);
      prevDateRef.current = date;
    }
  }, [date]);

  // Persist expanded area to module cache
  useEffect(() => {
    viewCache.expandedArea = expandedArea;
  }, [expandedArea]);

  // Restore scroll on mount if returning from a lightbox (handles remount case)
  useEffect(() => {
    if (viewCache.shouldRestoreScroll) {
      requestAnimationFrame(() => {
        window.scrollTo(0, viewCache.scrollY);
        viewCache.shouldRestoreScroll = false;
      });
    }
  }, []);

  const openLightbox = (url) => {
    viewCache.scrollY = window.scrollY;
    viewCache.shouldRestoreScroll = true;
    setLightboxUrl(url);
  };

  const closeLightbox = () => {
    setLightboxUrl(null);
    // Restore scroll after the overlay unmounts (handles no-remount case)
    setTimeout(() => {
      window.scrollTo(0, viewCache.scrollY);
      viewCache.shouldRestoreScroll = false;
    }, 50);
  };

  const workAreas = ['floor', 'bar', 'host', 'kitchen'];

  // Fetch all checklist items so task names can be shown in the current system language
  const { data: allChecklistItems = [] } = useQuery({
    queryKey: ['all-checklist-items'],
    queryFn: () => base44.entities.ChecklistItem.list('-sort_order', 500),
  });
  const taskMap = React.useMemo(() => {
    const map = {};
    allChecklistItems.forEach(item => { map[item.id] = item; });
    return map;
  }, [allChecklistItems]);

  const getAreaData = (checklistType, area) => {
    return dayData?.find(d => d.checklist_type === checklistType && d.work_area === area);
  };

  const renderChecklistSection = (checklistType) => {
    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-[#2A3D5A] mb-3">{t(checklistType)}</h3>
        {workAreas.map(area => {
          const data = getAreaData(checklistType, area);
          const completed = data?.completed_count || 0;
          const total = data?.total_tasks || 0;
          const isComplete = completed === total && total > 0;
          const hasPhotos = data?.completed_tasks?.some(t => t.photo_url);

          return (
            <button
              key={area}
              onClick={() => setExpandedArea(expandedArea === `${checklistType}-${area}` ? null : `${checklistType}-${area}`)}
              className="w-full text-left p-4 rounded-xl bg-white border-2 border-[#E8E0D8] hover:border-[#7ABC98]/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-[#7ABC98]" />
                  ) : completed > 0 ? (
                    <div className="h-5 w-5 rounded-full border-2 border-amber-500 bg-amber-50" />
                  ) : (
                    <XCircle className="h-5 w-5 text-[#E8E0D8]" />
                  )}
                  <span className="font-medium text-[#2A3D5A]">{t(area)}</span>
                </div>
                <div className="flex items-center gap-3">
                  {hasPhotos && <ImageIcon className="h-4 w-4 text-[#7A90E9]" />}
                  <span className={cn(
                    "text-sm font-semibold",
                    isComplete ? "text-[#7ABC98]" : completed > 0 ? "text-amber-600" : "text-[#2A3D5A]/40"
                  )}>
                    {completed}/{total}
                  </span>
                </div>
              </div>

              {/* Expanded Task List */}
              {expandedArea === `${checklistType}-${area}` && data && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 pt-4 border-t border-[#E8E0D8] space-y-2"
                >
                  {data.completed_tasks?.map((task, idx) => {
                    const originalTask = task.task_id ? taskMap[task.task_id] : null;
                    const taskName = originalTask
                      ? (getLocalizedField(originalTask, 'name') || task.task_name)
                      : task.task_name;
                    const photoUrls = task.photo_urls || (task.photo_url ? [task.photo_url] : []);
                    return (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        {task.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-[#7ABC98] mt-0.5 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-[#E8E0D8] mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={cn(
                            task.completed ? "text-[#2A3D5A]" : "text-[#2A3D5A]/40"
                          )}>
                            {taskName}
                          </p>
                          {task.note && (
                            <p className="text-xs text-[#2A3D5A]/50 mt-1">{task.note}</p>
                          )}
                          {photoUrls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {photoUrls.map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt=""
                                  onClick={() => openLightbox(url)}
                                  className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 hover:ring-2 hover:ring-[#7ABC98] transition-all"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 rounded-2xl bg-white border-2 border-[#E8E0D8] shadow-sm"
        >
          <BackArrow className="h-5 w-5 text-[#2A3D5A]" />
        </Button>
        <div>
          <h1 className="font-semibold text-xl text-[#2A3D5A]">{format(new Date(date), 'MMMM d, yyyy')}</h1>
          <p className="text-sm text-[#2A3D5A]/50">{t('submissionDetails')}</p>
        </div>
      </div>

      {/* Opening Section */}
      <div className="bg-[#FFF8F0] rounded-2xl p-5 border-2 border-[#E8E0D8]">
        {renderChecklistSection('opening')}
      </div>

      {/* Closing Section */}
      <div className="bg-[#FFF8F0] rounded-2xl p-5 border-2 border-[#E8E0D8]">
        {renderChecklistSection('closing')}
      </div>

      {lightboxUrl && createPortal(
        <ImageLightbox url={lightboxUrl} onClose={closeLightbox} alt="" />,
        document.body
      )}
    </motion.div>
  );
}