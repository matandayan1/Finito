import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function InventoryShortageButton({ workArea, reporterName }) {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items-waiter', workArea],
    queryFn: () => base44.entities.InventoryItem.filter({ work_area: workArea, is_active: true }),
    enabled: open,
  });

  const handleSubmit = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    await base44.entities.InventoryAlert.create({
      item_id: selectedItem.id,
      item_name_he: selectedItem.name_he,
      item_name_en: selectedItem.name_en || '',
      work_area: workArea,
      reported_by: reporterName || '',
      note: note.trim(),
      status: 'open',
      reported_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setOpen(false);
      setSelectedItem(null);
      setNote('');
    }, 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-all"
      >
        <AlertTriangle className="h-4 w-4" />
        דווח על חוסר במלאי
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-2 border-[#E8E0D8]">
          <DialogHeader>
            <DialogTitle className="text-[#2A3D5A] text-right flex items-center gap-2 justify-end">
              <span>דיווח חוסר במלאי</span>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-3">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-green-50 border-2 border-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="font-semibold text-[#2A3D5A]">הדיווח נשלח למנהל!</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-2">
                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-10 w-10 mx-auto text-[#2A3D5A]/20 mb-2" />
                    <p className="text-sm text-[#2A3D5A]/40">אין פריטי מלאי מוגדרים למחלקה זו</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-[#2A3D5A]/50">בחר פריט חסר:</Label>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {items.map(item => (
                          <button key={item.id} type="button"
                            onClick={() => setSelectedItem(item)}
                            className={cn(
                              "w-full text-right px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-3",
                              selectedItem?.id === item.id
                                ? "border-amber-400 bg-amber-50 text-amber-800"
                                : "border-[#E8E0D8] bg-white text-[#2A3D5A] hover:border-amber-200 hover:bg-amber-50/50"
                            )}>
                            <div className={cn(
                              "h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                              selectedItem?.id === item.id ? "border-amber-400 bg-amber-400" : "border-[#E8E0D8]"
                            )}>
                              {selectedItem?.id === item.id && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.name_he}</p>
                              {item.unit && <p className="text-xs text-[#2A3D5A]/40">{item.unit}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-[#2A3D5A]/50">הערה (אופציונלי)</Label>
                      <Input value={note} dir="rtl"
                        onChange={e => setNote(e.target.value)}
                        placeholder="למשל: נגמר לגמרי, נשאר מעט..."
                        className="rounded-xl border-2 border-[#E8E0D8] focus:border-amber-300" />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-2xl border-2 border-[#E8E0D8]">ביטול</Button>
                      <Button onClick={handleSubmit} disabled={!selectedItem || submitting}
                        className="flex-1 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שלח דיווח'}
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}