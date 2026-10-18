import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../LanguageContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import TaskItem from './TaskItem';
import InventoryShortageButton from './InventoryShortageButton';
import SignatureDialog from './SignatureDialog';
import StockPickupSection from './StockPickupSection';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

export default function ChecklistView({ shiftInfo, onBack, onSubmit }) {
  const { t, isRTL } = useLanguage();
  const [taskValues, setTaskValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [progressId, setProgressId] = useState(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [workerName, setWorkerName] = useState(() => localStorage.getItem('worker_name') || '');
  const [stockPickup, setStockPickup] = useState({}); // { itemId: qty }
  const queryClient = useQueryClient();
  const today = shiftInfo.date || format(new Date(), 'yyyy-MM-dd');

  // Load existing progress
  const { data: existingProgress } = useQuery({
    queryKey: ['checklist-progress', today, shiftInfo.checklistType, shiftInfo.workArea],
    queryFn: async () => {
      const results = await base44.entities.ChecklistProgress.filter({
        date: today,
        checklist_type: shiftInfo.checklistType,
        work_area: shiftInfo.workArea
      });
      return results.length > 0 ? results[0] : null;
    }
  });

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDayName = dayNames[new Date(today + 'T12:00:00').getDay()];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['checklist-tasks', shiftInfo.workArea, shiftInfo.checklistType],
    queryFn: async () => {
      const allTasks = await base44.entities.ChecklistItem.filter({
        work_area: shiftInfo.workArea,
        is_active: true
      }, 'sort_order');
      return allTasks.filter(task => {
        // Filter by checklist type
        if (task.checklist_type !== 'both' && task.checklist_type !== shiftInfo.checklistType) return false;
        // Filter specific_days tasks - only show if today is in their days_of_week
        if (task.recurring_schedule === 'specific_days') {
          return task.days_of_week?.includes(todayDayName);
        }
        return true;
      });
    }
  });

  // Initialize or restore progress
  useEffect(() => {
    if (tasks.length > 0 && !progressId) {
      if (existingProgress && existingProgress.status === 'in_progress') {
        // Restore existing progress
        const restored = {};
        existingProgress.completed_tasks.forEach(ct => {
          restored[ct.task_id] = {
            completed: ct.completed,
            note: ct.note || '',
            photo_url: ct.photo_url || null
          };
        });
        // Add any missing tasks
        tasks.forEach(task => {
          if (!restored[task.id]) {
            restored[task.id] = { completed: false, note: '', photo_urls: [] };
          }
        });
        setTaskValues(restored);
        setProgressId(existingProgress.id);
      } else if (Object.keys(taskValues).length === 0) {
        // Fresh start only if taskValues is empty
        const initialValues = {};
        tasks.forEach(task => {
          initialValues[task.id] = { completed: false, note: '', photo_urls: [] };
        });
        setTaskValues(initialValues);
      }
    }
  }, [tasks, existingProgress, progressId, taskValues]);

  // Autosave mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (progressId) {
        return await base44.entities.ChecklistProgress.update(progressId, data);
      } else {
        const created = await base44.entities.ChecklistProgress.create(data);
        setProgressId(created.id);
        return created;
      }
    }
  });

  const noteDebounceRef = useRef(null);

  const triggerSave = useCallback((updated) => {
    const completedTasks = tasks.map(task => {
      const taskData = updated[task.id] || { completed: false, note: '', photo_urls: [] };
      return {
        task_id: task.id,
        task_name: task.name_en,
        completed: taskData.completed || false,
        note: taskData.note || '',
        photo_url: taskData.photo_url || '',
        photo_urls: taskData.photo_urls || (taskData.photo_url ? [taskData.photo_url] : [])
      };
    });
    const completedCount = Object.values(updated).filter(v => v?.completed).length;
    saveMutation.mutate({
      date: today,
      checklist_type: shiftInfo.checklistType,
      work_area: shiftInfo.workArea,
      status: 'in_progress',
      completed_tasks: completedTasks,
      total_tasks: tasks.length,
      completed_count: completedCount,
      last_updated: new Date().toISOString()
    });
  }, [tasks, today, shiftInfo, saveMutation]);

  // Autosave on task change — note changes are debounced 2s to avoid per-keystroke writes
  const handleTaskChange = useCallback((taskId, value, isNoteOnly = false) => {
    setTaskValues(prev => {
      const updated = { ...prev, [taskId]: value };
      if (isNoteOnly) {
        // Debounce note saves — cancel previous timer and set a new one
        if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
        noteDebounceRef.current = setTimeout(() => triggerSave(updated), 2000);
      } else {
        // Immediate save for checkbox/photo changes
        if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current);
        triggerSave(updated);
      }
      return updated;
    });
  }, [triggerSave]);

  const completedCount = Object.values(taskValues).filter(v => v?.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  const canSubmit = () => {
    for (const task of tasks) {
      const value = taskValues[task.id];
      const photoUrls = value?.photo_urls || (value?.photo_url ? [value.photo_url] : []);
      if (task.photo_requirement === 'required' && value?.completed && photoUrls.length === 0) {
        return false;
      }
    }
    // Allow submission even with 0 completed tasks (e.g. stock-only shifts or no tasks configured)
    return tasks.length === 0 || completedCount >= 0;
  };

  const handleSubmitClick = () => {
    setSignatureOpen(true);
  };

  const handleSubmit = async (submitterName) => {
    setSignatureOpen(false);
    localStorage.setItem('worker_name', submitterName);
    setWorkerName(submitterName);
    setSubmitting(true);

    // Deduct picked items from warehouse stock
    const pickupEntries = Object.entries(stockPickup).filter(([, qty]) => qty > 0);
    for (const [itemId, qty] of pickupEntries) {
      const item = await base44.entities.InventoryItem.filter({ id: itemId }).then(r => r[0]).catch(() => null);
      if (!item) continue;
      const prevStock = Number(item.current_stock) || 0;
      const newStock = Math.max(0, prevStock - qty);
      await base44.entities.InventoryItem.update(itemId, { current_stock: newStock });
      base44.entities.InventoryMovement.create({
        item_id: itemId,
        item_name_he: item.name_he,
        work_area: item.work_area,
        previous_stock: prevStock,
        new_stock: newStock,
        change_amount: -qty,
        updated_by: submitterName,
        source: 'manual',
        notes: `מילוי מחלקת ${shiftInfo.workArea}`,
      });
    }
    const now = new Date();
    const completedTasks = tasks.map(task => {
      const taskData = taskValues[task.id] || {};
      return {
        task_id: task.id,
        task_name: task.name_en,
        completed: taskData.completed || false,
        note: taskData.note || '',
        photo_url: taskData.photo_url || '',
        photo_urls: taskData.photo_urls || (taskData.photo_url ? [taskData.photo_url] : [])
      };
    });

    // Mark as completed
    if (progressId) {
      await base44.entities.ChecklistProgress.update(progressId, {
        status: 'completed',
        submitted_by: submitterName,
        submission_time: now.toISOString(),
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        completed_count: completedCount
      });
    }

    // Also save to old Submission for backward compatibility
    await onSubmit({
      date: today,
      shiftType: shiftInfo.checklistType,
      workArea: shiftInfo.workArea,
      completedTasks,
      totalTasks,
      completedCount,
      submissionTime: now.toISOString()
    });
    
    queryClient.invalidateQueries({ queryKey: ['checklist-progress'] });
    setSubmitting(false);
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#7ABC98]" />
      </div>
    );
  }

  const getMessage = () => {
    if (progress === 100) return t('lookingGood');
    if (progress >= 70) return t('oneMoreStep');
    return `${completedCount}/${totalTasks} ${t('tasksCompleted')}`;
  };

  return (
    <motion.div 
      className="space-y-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-4 bg-gradient-to-b from-[#FFF8F0] via-[#FFF8F0] to-transparent">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="h-10 w-10 rounded-2xl bg-white border-2 border-[#E8E0D8] shadow-sm hover:bg-[#FFF8F0]"
          >
            <BackArrow className="h-5 w-5 text-[#2A3D5A]" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg text-[#2A3D5A]">
              {shiftInfo.checklistType === 'opening' ? 'רשימת פתיחה' : 'רשימת סגירה'}
            </h1>
            <p className="text-sm text-[#2A3D5A]/50">{t(shiftInfo.workArea)}</p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="bg-white rounded-2xl p-4 border-2 border-[#E8E0D8] shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-[#2A3D5A]/70">{getMessage()}</span>
            <span className={cn(
              "text-sm font-semibold",
              progress === 100 ? "text-[#7ABC98]" : "text-[#2A3D5A]/40"
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#E8E0D8] overflow-hidden">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-[#7ABC98] to-[#6aac88]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-6">
        {/* Daily Tasks */}
        {tasks.filter(t => t.recurring_schedule === 'specific_days').length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-gradient-to-r from-[#7ABC98]/40 to-transparent" />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7ABC98]/10 border border-[#7ABC98]/30">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="h-3.5 w-3.5 text-[#7ABC98]" />
                </motion.div>
                <span className="text-sm font-medium text-[#7ABC98]">משימה יומית</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-l from-[#7ABC98]/40 to-transparent" />
            </div>
            {tasks.filter(t => t.recurring_schedule === 'specific_days').map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                value={taskValues[task.id]}
                onChange={(value, isNoteOnly) => handleTaskChange(task.id, value, isNoteOnly)}
                index={index}
              />
            ))}
          </div>
        )}

        {/* Regular Tasks */}
        {tasks.filter(t => t.recurring_schedule !== 'specific_days').length > 0 && (
          <div className="space-y-3">
            {tasks.filter(t => t.recurring_schedule === 'specific_days').length > 0 && (
              <div className="flex items-center gap-2 px-1 pt-2">
                <div className="h-px flex-1 bg-[#E8E0D8]" />
                <span className="text-xs font-medium text-[#2A3D5A]/40 px-3">משימות קבועות</span>
                <div className="h-px flex-1 bg-[#E8E0D8]" />
              </div>
            )}
            {tasks.filter(t => t.recurring_schedule !== 'specific_days').map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                value={taskValues[task.id]}
                onChange={(value, isNoteOnly) => handleTaskChange(task.id, value, isNoteOnly)}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stock Pickup from Warehouse */}
      <StockPickupSection
        workArea={shiftInfo.workArea}
        onPickupChange={setStockPickup}
      />

      {/* Inventory Shortage */}
      <div className="flex justify-center pt-2">
        <InventoryShortageButton workArea={shiftInfo.workArea} reporterName="" />
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-4 pt-4">
        <motion.div
          whileHover={{ scale: canSubmit() ? 1.01 : 1 }}
          whileTap={{ scale: canSubmit() ? 0.99 : 1 }}
        >
          <Button
            onClick={handleSubmitClick}
            disabled={!canSubmit() || submitting}
            className={cn(
              "w-full h-14 text-lg font-semibold shadow-xl rounded-2xl transition-all duration-300",
              canSubmit() 
                ? "bg-[#2A3D5A] hover:bg-[#1e2d42] shadow-[#2A3D5A]/30" 
                : "bg-[#E8E0D8] text-[#2A3D5A]/40"
            )}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t('submitChecklist')
            )}
          </Button>
        </motion.div>
      </div>
      <SignatureDialog
        open={signatureOpen}
        workerName={workerName}
        onConfirm={handleSubmit}
        onCancel={() => setSignatureOpen(false)}
      />
    </motion.div>
  );
}