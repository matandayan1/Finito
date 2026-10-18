import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { enUS, he, ja, fr, ru } from 'date-fns/locale';
import {
  CheckCircle2, ClipboardList, AlertTriangle, MessageSquare,
  ChevronDown, ChevronUp, Calendar, Users, Package
} from 'lucide-react';

const DATE_LOCALES = { en: enUS, he, ja, fr, ru };

const AREA_COLORS = {
  floor: 'bg-blue-50 text-blue-700 border-blue-200',
  bar: 'bg-purple-50 text-purple-700 border-purple-200',
  host: 'bg-amber-50 text-amber-700 border-amber-200',
  kitchen: 'bg-orange-50 text-orange-700 border-orange-200',
  cleaning: 'bg-teal-50 text-teal-700 border-teal-200',
};

function getStockStatus(item) {
  const current = Number(item.current_stock);
  const min = Number(item.min_stock);
  if (!item.min_stock) return 'ok';
  if (current <= min) return 'critical';
  if (current < min * 1.3) return 'low';
  return 'ok';
}

function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

function fmtDate(dateObj, language) {
  const locale = DATE_LOCALES[language] || enUS;
  try {
    return format(dateObj, 'EEEE d MMMM', { locale });
  } catch {
    return format(dateObj, 'd MMMM yyyy');
  }
}

export default function DailyReportSummary({ selectedDate, onDateClick }) {
  const { t, isRTL, getLocalizedField, language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const date = selectedDate || todayStr();
  const dateObj = useMemo(() => new Date(date + 'T00:00:00'), [date]);

  const { data: progress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['daily-progress', date],
    queryFn: () => base44.entities.ChecklistProgress.filter({ date }),
    enabled: !!date,
    staleTime: 60000,
  });

  const { data: submissions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['daily-submissions', date],
    queryFn: () => base44.entities.Submission.filter({ date }),
    enabled: !!date,
    staleTime: 60000,
  });

  const { data: inventory = [], isLoading: loadingInv } = useQuery({
    queryKey: ['daily-inventory'],
    queryFn: () => base44.entities.InventoryItem.filter({ is_active: true }),
    staleTime: 120000,
  });

  const { data: allChecklistItems = [] } = useQuery({
    queryKey: ['all-checklist-items'],
    queryFn: () => base44.entities.ChecklistItem.list('-sort_order', 500),
    staleTime: 120000,
  });
  const taskMap = useMemo(() => {
    const map = {};
    allChecklistItems.forEach(item => { map[item.id] = item; });
    return map;
  }, [allChecklistItems]);
  const getTaskName = (task) => {
    const originalTask = task.task_id ? taskMap[task.task_id] : null;
    return originalTask ? (getLocalizedField(originalTask, 'name') || task.task_name) : task.task_name;
  };

  const isLoading = loadingProgress || loadingSubs || loadingInv;

  // Aggregate completed tasks
  const stats = useMemo(() => {
    let totalCompleted = 0;
    let totalTasks = 0;
    const shiftsByArea = {};
    const notes = [];

    const collectRecord = (rec, submittedBy) => {
      totalCompleted += rec.completed_count || 0;
      totalTasks += rec.total_tasks || 0;
      const area = rec.work_area || 'floor';
      if (!shiftsByArea[area]) shiftsByArea[area] = { completed: 0, total: 0, count: 0 };
      shiftsByArea[area].count += 1;
      shiftsByArea[area].completed += rec.completed_count || 0;
      shiftsByArea[area].total += rec.total_tasks || 0;

      (rec.completed_tasks || []).forEach(task => {
        if (task.note && task.note.trim()) {
          notes.push({
            area,
            name: getTaskName(task),
            note: task.note.trim(),
            submittedBy,
          });
        }
      });
    };

    progress.forEach(p => collectRecord(p, p.submitted_by));
    submissions.forEach(s => collectRecord(s, s.waiter_name));

    const lowStock = inventory
      .map(it => ({ ...it, _status: getStockStatus(it) }))
      .filter(it => it._status === 'critical' || it._status === 'low')
      .sort((a, b) => {
        if (a._status !== b._status) return a._status === 'critical' ? -1 : 1;
        return (a.name_he || '').localeCompare(b.name_he || '');
      });

    const completionPct = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

    return {
      totalCompleted,
      totalTasks,
      completionPct,
      shiftsByArea,
      notes,
      lowStock,
      shiftsCount: progress.length + submissions.length,
    };
  }, [progress, submissions, inventory]);

  const { totalCompleted, totalTasks, completionPct, shiftsByArea, notes, lowStock, shiftsCount } = stats;

  return (
    <div className="rounded-3xl bg-white border-2 border-[#E8E0D8] shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 bg-gradient-to-l from-[#2A3D5A] to-[#3a4d6a] text-white"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center">
            <ClipboardList className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <div className="text-right">
            <div className="font-bold text-lg leading-tight">{t('dailyReportTitle')}</div>
            <div className="text-sm text-white/70 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDate(dateObj, language)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/15">
            <span className="text-xl sm:text-2xl font-bold leading-none">{completionPct}%</span>
            <span className="hidden sm:inline text-xs text-white/70">{t('completion')}</span>
          </div>
          <motion.div animate={{ rotate: expanded ? (isRTL ? 180 : 0) : (isRTL ? 0 : 180) }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 space-y-5">
              {/* Quick stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  value={`${totalCompleted}/${totalTasks}`}
                  label={t('tasksCompletedLabel')}
                  color="bg-[#7ABC98]/10 text-[#7ABC98] border-[#7ABC98]/30"
                />
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  value={shiftsCount}
                  label={t('shiftsSubmitted')}
                  color="bg-blue-50 text-blue-600 border-blue-200"
                />
                <StatCard
                  icon={<AlertTriangle className="h-5 w-5" />}
                  value={lowStock.length}
                  label={t('lowStockItems')}
                  color="bg-amber-50 text-amber-600 border-amber-200"
                />
                <StatCard
                  icon={<MessageSquare className="h-5 w-5" />}
                  value={notes.length}
                  label={t('specialNotes')}
                  color="bg-purple-50 text-purple-600 border-purple-200"
                />
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 py-3 text-sm text-[#2A3D5A]/40">
                  <div className="h-4 w-4 rounded-full border-2 border-[#E8E0D8] border-t-[#7ABC98] animate-spin" />
                  {t('loadingShiftData')}
                </div>
              )}

              {/* Completion progress bar */}
              {totalTasks > 0 && (
                <div className="p-4 rounded-2xl bg-[#FFF8F0] border border-[#E8E0D8]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#2A3D5A]">{t('overallCompletion')}</span>
                    <span className="text-sm font-bold text-[#2A3D5A]">{completionPct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#E8E0D8] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className={cn(
                        'h-full rounded-full',
                        completionPct >= 80 ? 'bg-[#7ABC98]' : completionPct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Low stock section */}
              {lowStock.length > 0 && (
                <Section title={t('lowStockItems')} icon={<Package className="h-4 w-4" />} accent="text-amber-600">
                  <div className="space-y-2">
                    {lowStock.map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FFF8F0] border border-[#E8E0D8]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn(
                            'shrink-0 h-2 w-2 rounded-full',
                            item._status === 'critical' ? 'bg-red-500' : 'bg-amber-400'
                          )} />
                          <span className="font-medium text-sm text-[#2A3D5A] truncate">{getLocalizedField(item, 'name')}</span>
                          {item.work_area && (
                            <span className={cn('shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border', AREA_COLORS[item.work_area])}>
                              {t(item.work_area)}
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 text-xs text-[#2A3D5A]/60 whitespace-nowrap">
                          <span className={item._status === 'critical' ? 'text-red-600 font-bold' : 'text-amber-600 font-bold'}>
                            {Number(item.current_stock) || 0}
                          </span>
                          {' / '}
                          {Number(item.min_stock) || 0} {item.unit || ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Special notes section */}
              {notes.length > 0 && (
                <Section title={t('specialNotesFromShifts')} icon={<MessageSquare className="h-4 w-4" />} accent="text-purple-600">
                  <div className="space-y-2">
                    {notes.map((n, i) => (
                      <div key={i} className="flex gap-2.5 p-2.5 rounded-xl bg-purple-50/40 border border-purple-100">
                        <MessageSquare className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-medium text-sm text-[#2A3D5A]">{n.name}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md border', AREA_COLORS[n.area])}>
                              {t(n.area)}
                            </span>
                            {n.submittedBy && (
                              <span className="text-[11px] text-[#2A3D5A]/40">— {n.submittedBy}</span>
                            )}
                          </div>
                          <p className="text-sm text-[#2A3D5A]/75 leading-snug">{n.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Empty state when no activity */}
              {!isLoading && totalTasks === 0 && lowStock.length === 0 && notes.length === 0 && (
                <div className="text-center py-8">
                  <div className="h-14 w-14 mx-auto mb-3 rounded-2xl bg-[#FFF8F0] flex items-center justify-center">
                    <ClipboardList className="h-7 w-7 text-[#2A3D5A]/25" />
                  </div>
                  <p className="text-sm text-[#2A3D5A]/40 font-medium">{t('noActivityRecorded')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border', color)}>
      <div className="h-9 w-9 rounded-xl bg-white/60 flex items-center justify-center">{icon}</div>
      <div className="text-xl font-bold leading-none">{value}</div>
      <div className="text-[11px] opacity-70 text-center leading-tight">{label}</div>
    </div>
  );
}

function Section({ title, icon, accent, children }) {
  return (
    <div>
      <div className={cn('flex items-center gap-2 mb-2.5 font-semibold text-sm', accent)}>
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}