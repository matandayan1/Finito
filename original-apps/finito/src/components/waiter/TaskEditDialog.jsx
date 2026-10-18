import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { Eye, EyeOff, AlertCircle, Loader2, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

const MANAGER_PASSWORD = "manager123";

export default function TaskEditDialog({ task, open, onClose, onSaved }) {
  const [step, setStep] = useState('password'); // 'password' | 'edit'
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name_he: task?.name_he || '',
    name_en: task?.name_en || '',
    description_he: task?.description_he || '',
    description_en: task?.description_en || '',
    work_area: task?.work_area || 'floor',
    checklist_type: task?.checklist_type || 'both',
    photo_requirement: task?.photo_requirement || 'none',
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === MANAGER_PASSWORD) {
      setStep('edit');
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2500);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    await base44.entities.ChecklistItem.update(task.id, formData);
    setLoading(false);
    onSaved();
    handleClose();
  };

  const handleClose = () => {
    setStep('password');
    setPassword('');
    setPasswordError(false);
    onClose();
  };

  const areas = ['floor', 'bar', 'host', 'kitchen'];
  const areaLabels = { floor: 'פלור', bar: 'בר', host: 'אירוח', kitchen: 'מטבח' };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl border-2 border-[#E8E0D8]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#2A3D5A] text-right">
            {step === 'password' ? 'אימות מנהל' : 'עריכת משימה'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'password' ? (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handlePasswordSubmit}
              className="space-y-5 pt-2"
            >
              <div className="flex items-center justify-center h-16 w-16 mx-auto rounded-2xl bg-[#2A3D5A]/5 border-2 border-[#E8E0D8]">
                <Lock className="h-7 w-7 text-[#2A3D5A]/40" />
              </div>
              <p className="text-center text-sm text-[#2A3D5A]/50">הכנס סיסמת מנהל לעריכת המשימה</p>

              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="סיסמה"
                  dir="ltr"
                  className={cn(
                    "h-12 rounded-2xl border-2 pr-12 text-center",
                    passwordError ? "border-red-300 bg-red-50" : "border-[#E8E0D8] focus:border-[#7ABC98]"
                  )}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2A3D5A]/40">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <AnimatePresence>
                {passwordError && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    סיסמה שגויה
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1 rounded-2xl border-2 border-[#E8E0D8]">ביטול</Button>
                <Button type="submit" className="flex-1 rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42]">אישור</Button>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="edit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSave}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">שם משימה (עברית)</Label>
                <Input value={formData.name_he} dir="rtl"
                  onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
                  className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">שם משימה (אנגלית)</Label>
                <Input value={formData.name_en} dir="ltr"
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">תיאור (עברית)</Label>
                <Textarea value={formData.description_he} dir="rtl" rows={2}
                  onChange={(e) => setFormData({ ...formData, description_he: e.target.value })}
                  className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#2A3D5A]/50">אזור</Label>
                  <Select value={formData.work_area} onValueChange={(v) => setFormData({ ...formData, work_area: v })}>
                    <SelectTrigger className="rounded-xl border-2 border-[#E8E0D8] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{areas.map(a => <SelectItem key={a} value={a}>{areaLabels[a]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#2A3D5A]/50">משמרת</Label>
                  <Select value={formData.checklist_type} onValueChange={(v) => setFormData({ ...formData, checklist_type: v })}>
                    <SelectTrigger className="rounded-xl border-2 border-[#E8E0D8] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">הכל</SelectItem>
                      <SelectItem value="opening">פתיחה</SelectItem>
                      <SelectItem value="closing">סגירה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#2A3D5A]/50">תמונה</Label>
                  <Select value={formData.photo_requirement} onValueChange={(v) => setFormData({ ...formData, photo_requirement: v })}>
                    <SelectTrigger className="rounded-xl border-2 border-[#E8E0D8] text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא</SelectItem>
                      <SelectItem value="optional">אופציונלי</SelectItem>
                      <SelectItem value="required">חובה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1 rounded-2xl border-2 border-[#E8E0D8]">ביטול</Button>
                <Button type="submit" disabled={loading} className="flex-1 rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42]">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}