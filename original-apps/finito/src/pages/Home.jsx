import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { LanguageProvider, useLanguage } from '../components/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import FinitoLogo from '../components/ui/FinitoLogo';
import FinitoSuccess from '../components/ui/FinitoSuccess';
import AreaSelector from '../components/waiter/AreaSelector';
import ChecklistView from '../components/waiter/ChecklistView';
import { Button } from "@/components/ui/button";
import { Settings, Warehouse } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import StockWithdrawalDialog from '../components/waiter/StockWithdrawalDialog';

function HomeContent() {
  const { t, isRTL } = useLanguage();
  const [view, setView] = useState('select');
  const [shiftInfo, setShiftInfo] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);

  const handleAreaSelect = (info) => {
    setShiftInfo(info);
    setView('checklist');
  };

  const handleSubmit = async (data) => {
    // Save to old Submission entity for backward compatibility
    await base44.entities.Submission.create({
      waiter_name: 'Staff',
      waiter_email: '',
      date: data.date,
      shift_type: data.shiftType,
      work_area: data.workArea,
      completed_tasks: data.completedTasks,
      total_tasks: data.totalTasks,
      completed_count: data.completedCount,
      submission_time: data.submissionTime
    });
    
    setShowSuccess(true);
  };

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    setView('select');
    setShiftInfo(null);
  };

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-b from-[#FFF8F0] to-[#F5EDE6]",
      isRTL && "rtl"
    )}>
      {/* Success Animation */}
      <AnimatePresence>
        {showSuccess && <FinitoSuccess onComplete={handleSuccessComplete} />}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[#E8E0D8]/50">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <FinitoLogo />
          <div className="flex items-center gap-2">
            <LanguageSelector minimal />
            <Link to={createPageUrl('Manager')}>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-10 w-10 rounded-2xl bg-white/60 border-2 border-[#E8E0D8] shadow-sm hover:bg-white"
              >
                <Settings className="h-5 w-5 text-[#2A3D5A]/60" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <StockWithdrawalDialog open={showWithdrawal} onClose={() => setShowWithdrawal(false)} />

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <AreaSelector onSelect={handleAreaSelect} />
            </motion.div>
          )}

          {view === 'checklist' && shiftInfo && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ChecklistView 
                shiftInfo={shiftInfo}
                onBack={() => setView('select')}
                onSubmit={handleSubmit}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Withdrawal Button */}
        {view === 'select' && (
          <div className="fixed bottom-4 left-4 z-10">
            <button
              onClick={() => setShowWithdrawal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#2A3D5A]/80 backdrop-blur-sm text-white text-xs font-medium shadow-md hover:bg-[#2A3D5A] active:scale-95 transition-all"
            >
              <Warehouse className="h-3.5 w-3.5 text-blue-300" />
              מחסן
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <HomeContent />
    </LanguageProvider>
  );
}