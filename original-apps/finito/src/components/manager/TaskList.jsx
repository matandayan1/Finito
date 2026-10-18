import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { GripVertical, Pencil, Trash2, Camera, Sun, Sunset, Moon, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function TaskList({ tasks, onEdit, onDelete, onReorder }) {
  const { t, getLocalizedField, isRTL } = useLanguage();
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const dailyTasks = tasks.filter(task => task.recurring_schedule === 'specific_days');
  const regularTasks = tasks.filter(task => task.recurring_schedule !== 'specific_days');

  const dayLabels = { sunday: 'א׳', monday: 'ב׳', tuesday: 'ג׳', wednesday: 'ד׳', thursday: 'ה׳', friday: 'ו׳', saturday: 'ש׳' };
  const getDaysLabel = (task) => task.days_of_week?.map(d => dayLabels[d]).join(', ') || '';

  const handleDragEnd = (result, isDaily) => {
    if (!result.destination) return;
    const sourceList = isDaily ? [...dailyTasks] : [...regularTasks];
    const [reordered] = sourceList.splice(result.source.index, 1);
    sourceList.splice(result.destination.index, 0, reordered);
    const fullList = isDaily ? [...sourceList, ...regularTasks] : [...dailyTasks, ...sourceList];
    onReorder(fullList);
    Promise.all(sourceList.map((item, i) => base44.entities.ChecklistItem.update(item.id, { sort_order: i })));
  };

  const getChecklistIcon = (checklistType) => {
    const icons = { opening: Sun, closing: Moon, both: Clock };
    const Icon = icons[checklistType] || Clock;
    return <Icon className="h-3.5 w-3.5" />;
  };

  if (tasks.length === 0) {
    return (
      <motion.div 
        className="text-center py-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="h-20 w-20 mx-auto mb-4 rounded-3xl bg-[#FFF8F0] flex items-center justify-center border-2 border-[#E8E0D8]">
          <Camera className="h-8 w-8 text-[#2A3D5A]/30" />
        </div>
        <p className="text-lg font-medium text-[#2A3D5A]/40">{t('noTasks')}</p>
        <p className="text-sm text-[#2A3D5A]/30 mt-1">{t('addFirstTask')}</p>
      </motion.div>
    );
  }

  const renderTaskList = (taskList, isDaily = false) => (
    <DragDropContext onDragEnd={(result) => handleDragEnd(result, isDaily)}>
      <Droppable droppableId={isDaily ? "daily-tasks" : "regular-tasks"}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
            {taskList.map((task, index) => (
              <Draggable key={task.id} draggableId={task.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={cn(
                      "p-4 rounded-2xl transition-all border-2 bg-white",
                      snapshot.isDragging ? "shadow-xl border-[#7ABC98] scale-105" : "border-[#E8E0D8] hover:border-[#7ABC98]/50 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        {...provided.dragHandleProps} 
                        className="text-[#2A3D5A]/30 hover:text-[#7ABC98] cursor-grab active:cursor-grabbing p-1 touch-none"
                      >
                        <GripVertical className="h-6 w-6" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[#2A3D5A] truncate">{getLocalizedField(task, 'name')}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[#FFF8F0] text-[#2A3D5A]/70">
                            {getChecklistIcon(task.checklist_type)}
                            <span className={cn(isRTL && "mr-1")}>{task.checklist_type === 'both' ? t('all') : t(task.checklist_type)}</span>
                          </span>
                          {task.recurring_schedule === 'specific_days' && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[#7ABC98]/10 text-[#7ABC98]">
                              <Clock className="h-3 w-3" />
                              {getDaysLabel(task)}
                            </span>
                          )}
                          {task.photo_requirement !== 'none' && (
                            <span className={cn(
                              "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg",
                              task.photo_requirement === 'required' ? "bg-[#7ABC98]/10 text-[#7ABC98]" : "bg-[#FFF8F0] text-[#2A3D5A]/50"
                            )}>
                              <Camera className="h-3 w-3" />
                              {t(task.photo_requirement)}
                            </span>
                          )}
                          {task.example_images?.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-500">
                              <Camera className="h-3 w-3" />
                              {task.example_images.length} תמונות דוגמה
                            </span>
                          )}
                        </div>
                        {/* Example images strip */}
                        {task.example_images?.length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {task.example_images.map((url, i) => (
                              <img key={i} src={url} alt="" className="h-16 w-16 rounded-xl object-cover border-2 border-[#E8E0D8] shadow-sm cursor-zoom-in active:scale-95 transition-transform" onClick={() => setLightboxUrl(url)} />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-[#2A3D5A]/40 hover:text-[#2A3D5A] hover:bg-[#FFF8F0]" onClick={() => onEdit(task)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-[#2A3D5A]/40 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(task)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );

  return (
    <div className="space-y-6">
      {/* Daily Tasks Section */}
      {dailyTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <div className="h-px flex-1 bg-gradient-to-r from-[#7ABC98]/40 to-transparent" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#7ABC98]/10 border border-[#7ABC98]/30">
              <Clock className="h-3.5 w-3.5 text-[#7ABC98]" />
              <span className="text-sm font-medium text-[#7ABC98]">משימות יומיות</span>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-[#7ABC98]/40 to-transparent" />
          </div>
          {renderTaskList(dailyTasks, true)}
        </div>
      )}

      {/* Regular Tasks Section */}
      {regularTasks.length > 0 && (
        <div className="space-y-3">
          {dailyTasks.length > 0 && (
            <div className="flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-gradient-to-r from-[#E8E0D8] to-transparent" />
              <span className="text-sm font-medium text-[#2A3D5A]/40 px-3">משימות קבועות</span>
              <div className="h-px flex-1 bg-gradient-to-l from-[#E8E0D8] to-transparent" />
            </div>
          )}
          {renderTaskList(regularTasks, false)}
        </div>
      )}
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}