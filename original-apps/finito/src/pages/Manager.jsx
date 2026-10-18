import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LanguageProvider, useLanguage } from '../components/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import FinitoLogo from '../components/ui/FinitoLogo';
import ManagerLogin from '../components/manager/ManagerLogin';
import TaskForm from '../components/manager/TaskForm';
import TaskList from '../components/manager/TaskList';
import DayCard from '../components/manager/DayCard';
import DayDetailView from '../components/manager/DayDetailView';
import SubmissionCard from '../components/manager/SubmissionCard';
import SubmissionDetail from '../components/manager/SubmissionDetail';
import LanguageManagement from '../components/manager/LanguageManagement';
import InventoryManager from '../components/manager/InventoryManager';
import NotificationCenter from '../components/manager/NotificationCenter';
import MonthlyReportExport from '../components/manager/MonthlyReportExport';
import BarcodeScanner from '../components/manager/BarcodeScanner';
import DailyReportSummary from '../components/manager/DailyReportSummary';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Plus, List, FileText, Loader2, LogOut, Globe, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

function ManagerContent() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('reports');
  const [selectedArea, setSelectedArea] = useState('floor');
  const [selectedChecklistType, setSelectedChecklistType] = useState('opening');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const workAreas = ['floor', 'bar', 'host', 'kitchen', 'cleaning'];
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const { data: allTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks', selectedArea],
    queryFn: () => base44.entities.ChecklistItem.filter({ work_area: selectedArea }, 'sort_order'),
    enabled: isLoggedIn
  });

  // Filter tasks by checklist type
  const tasks = allTasks.filter(task => 
    task.checklist_type === 'both' || task.checklist_type === selectedChecklistType
  );

  const { data: progressData = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['all-progress'],
    queryFn: () => base44.entities.ChecklistProgress.list('-date', 100),
    enabled: isLoggedIn
  });

  // Group by date
  const daysByDate = {};
  progressData.forEach(p => {
    if (!daysByDate[p.date]) {
      daysByDate[p.date] = { opening: [], closing: [] };
    }
    if (p.checklist_type === 'opening') {
      daysByDate[p.date].opening.push(p);
    } else {
      daysByDate[p.date].closing.push(p);
    }
  });

  const sortedDates = Object.keys(daysByDate).sort((a, b) => new Date(b) - new Date(a));

  const handleDeleteTask = async () => {
    if (deleteTask) {
      await base44.entities.ChecklistItem.delete(deleteTask.id);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeleteTask(null);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className={cn("min-h-screen bg-gradient-to-b from-[#FFF8F0] to-[#F5EDE6]", isRTL && "rtl")}>
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[#E8E0D8]/50">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-2xl"><BackArrow className="h-5 w-5 text-[#2A3D5A]" /></Button>
              <span className="font-semibold text-[#2A3D5A]">{t('managerMode')}</span>
            </Link>
            <LanguageSelector minimal />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">
          <ManagerLogin onLogin={() => setIsLoggedIn(true)} />
        </main>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-gradient-to-b from-[#FFF8F0] to-[#F5EDE6]", isRTL && "rtl")}>
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[#E8E0D8]/50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <FinitoLogo />
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <LanguageSelector minimal />
            <Button variant="ghost" size="sm" onClick={() => setIsLoggedIn(false)} className="gap-2 rounded-2xl text-[#2A3D5A]/50 hover:text-[#2A3D5A] hover:bg-white border-2 border-transparent hover:border-[#E8E0D8]">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6 h-12 rounded-2xl bg-white border-2 border-[#E8E0D8] p-1">
            <TabsTrigger value="reports" className="gap-1.5 rounded-xl data-[state=active]:bg-[#2A3D5A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
              <FileText className="h-4 w-4" /><span className="hidden sm:inline">{t('reports')}</span><span className="sm:hidden">דוחות</span>
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-1.5 rounded-xl data-[state=active]:bg-[#2A3D5A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
              <List className="h-4 w-4" /><span className="hidden sm:inline">{t('checklistBuilder')}</span><span className="sm:hidden">משימות</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-1.5 rounded-xl data-[state=active]:bg-[#2A3D5A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
              <Package className="h-4 w-4" /><span className="hidden sm:inline">מלאי</span><span className="sm:hidden">מלאי</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 rounded-xl data-[state=active]:bg-[#2A3D5A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
              <Globe className="h-4 w-4" /><span className="hidden sm:inline">{t('languages')}</span><span className="sm:hidden">שפות</span>
            </TabsTrigger>
          </TabsList>

            <TabsContent value="reports" className="space-y-4">
              <DailyReportSummary selectedDate={selectedDay} />
              {selectedDay ? (
                <DayDetailView 
                  date={selectedDay} 
                  dayData={progressData.filter(p => p.date === selectedDay)}
                  onBack={() => setSelectedDay(null)} 
                />
              ) : (
                <>
                  {loadingProgress ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#7ABC98]" /></div>
                  ) : sortedDates.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="h-20 w-20 mx-auto mb-4 rounded-3xl bg-white flex items-center justify-center border-2 border-[#E8E0D8]"><FileText className="h-8 w-8 text-[#2A3D5A]/30" /></div>
                      <p className="text-lg font-medium text-[#2A3D5A]/40">{t('noSubmissions')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sortedDates.map((date, i) => (
                        <DayCard
                          key={date}
                          date={date}
                          openingData={daysByDate[date].opening}
                          closingData={daysByDate[date].closing}
                          onClick={() => setSelectedDay(date)}
                          index={i}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="checklists" className="space-y-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border-2 border-[#E8E0D8] shadow-sm">
                  <div className="flex gap-2 flex-wrap">
                    {workAreas.map(area => (
                      <Button key={area} variant={selectedArea === area ? 'default' : 'outline'} size="sm" onClick={() => setSelectedArea(area)} className={cn("rounded-xl transition-all", selectedArea === area ? "bg-[#2A3D5A]" : "border-2 border-[#E8E0D8] hover:border-[#7ABC98]")}>
                        {t(area)}
                      </Button>
                    ))}
                  </div>
                  <Button onClick={() => { setEditingTask(null); setTaskFormOpen(true); }} className="rounded-xl bg-[#7ABC98] hover:bg-[#6aac88] shadow-md transition-all">
                    <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />{t('createTask')}
                  </Button>
                </div>

                <div className="flex gap-2 p-2 bg-white rounded-2xl border-2 border-[#E8E0D8] shadow-sm w-fit">
                  <Button 
                    variant={selectedChecklistType === 'opening' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setSelectedChecklistType('opening')}
                    className={cn("rounded-xl transition-all", selectedChecklistType === 'opening' ? "bg-[#2A3D5A]" : "")}
                  >
                    {t('opening')}
                  </Button>
                  <Button 
                    variant={selectedChecklistType === 'closing' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setSelectedChecklistType('closing')}
                    className={cn("rounded-xl transition-all", selectedChecklistType === 'closing' ? "bg-[#2A3D5A]" : "")}
                  >
                    {t('closing')}
                  </Button>
                </div>
              </motion.div>

              {loadingTasks ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#7ABC98]" /></div>
              ) : (
                <TaskList tasks={tasks} onEdit={(t) => { setEditingTask(t); setTaskFormOpen(true); }} onDelete={setDeleteTask} onReorder={(items) => {
                  // Merge reordered tasks back into allTasks
                  const otherType = selectedChecklistType === 'opening' ? 'closing' : 'opening';
                  const otherTasks = allTasks.filter(t => t.checklist_type === otherType);
                  queryClient.setQueryData(['tasks', selectedArea], [...otherTasks, ...items]);
                }} />
              )}
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <div className="flex flex-wrap gap-2 justify-end">
                <BarcodeScanner activeArea="floor" />
                <MonthlyReportExport />
              </div>
              <InventoryManager />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <LanguageManagement />
            </TabsContent>
        </Tabs>
      </main>

      <TaskForm task={editingTask} open={taskFormOpen} onClose={() => { setTaskFormOpen(false); setEditingTask(null); }} onSaved={(savedTask) => {
        if (editingTask) {
          // Update in-place without reordering - just update the item data in cache
          queryClient.setQueryData(['tasks', selectedArea], (old = []) =>
            old.map(t => t.id === editingTask.id ? { ...t, ...savedTask } : t)
          );
        } else {
          // New task - append to end
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
      }} />
      <SubmissionDetail submission={selectedSubmission} open={!!selectedSubmission} onClose={() => setSelectedSubmission(null)} />
      
      <AlertDialog open={!!deleteTask} onOpenChange={() => setDeleteTask(null)}>
        <AlertDialogContent className="rounded-2xl border-2 border-[#E8E0D8]">
          <AlertDialogHeader><AlertDialogTitle className="text-[#2A3D5A]">{t('confirmDelete')}</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-2 border-[#E8E0D8]">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="rounded-xl bg-red-600 hover:bg-red-700">{t('delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Manager() {
  return (
    <LanguageProvider>
      <ManagerContent />
    </LanguageProvider>
  );
}