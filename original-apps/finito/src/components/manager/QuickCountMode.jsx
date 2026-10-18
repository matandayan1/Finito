import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { Scan, Check, Plus, Minus, Loader2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from "@/lib/utils";

const AREA_LABELS = { floor: 'פלור', bar: 'בר', host: 'אירוח', kitchen: 'מטבח', cleaning: "מנהלים" };

export default function QuickCountMode() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('scan'); // 'scan' | 'update' | 'notfound'
  const [currentItem, setCurrentItem] = useState(null);
  const [qty, setQty] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const scannerRef = useRef(null);
  const queryClient = useQueryClient();

  const startScanner = () => {
    setPhase('scan');
    setCurrentItem(null);
  };

  useEffect(() => {
    if (!open || phase !== 'scan') return;

    const timerId = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        'quick-count-scanner',
        { fps: 10, qrbox: { width: 250, height: 130 }, supportedScanTypes: [0, 1] },
        false
      );

      scanner.render(async (decodedText) => {
        await scanner.clear().catch(() => {});
        const allItems = await base44.entities.InventoryItem.filter({ is_active: true });
        const found = allItems.find(i =>
          i.barcode === decodedText || i.name_en?.toLowerCase() === decodedText.toLowerCase()
        );
        if (found) {
          setCurrentItem(found);
          setQty(Number(found.current_stock) || 0);
          setPhase('update');
        } else {
          setPhase('notfound');
        }
      }, () => {});

      scannerRef.current = scanner;
    }, 200);

    return () => {
      clearTimeout(timerId);
      scannerRef.current?.clear().catch(() => {});
    };
  }, [open, phase]);

  const handleSaveAndNext = async () => {
    if (!currentItem) return;
    setSaving(true);
    const prevStock = Number(currentItem.current_stock) || 0;

    await base44.entities.InventoryItem.update(currentItem.id, { current_stock: qty });

    if (qty !== prevStock) {
      base44.entities.InventoryMovement.create({
        item_id: currentItem.id,
        item_name_he: currentItem.name_he,
        work_area: currentItem.work_area,
        previous_stock: prevStock,
        new_stock: qty,
        change_amount: qty - prevStock,
        source: 'quick_count',
        updated_by: 'ספירת מלאי',
      });
    }

    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    setSavedItems(prev => [...prev, { ...currentItem, new_stock: qty }]);
    setSaving(false);
    startScanner();
  };

  const handleClose = () => {
    scannerRef.current?.clear().catch(() => {});
    setOpen(false);
    setPhase('scan');
    setCurrentItem(null);
    setSavedItems([]);
  };

  const diff = qty - (Number(currentItem?.current_stock) || 0);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="rounded-xl border-2 border-[#E8E0D8] hover:border-purple-400 gap-2 text-[#2A3D5A]"
      >
        <Scan className="h-4 w-4 text-purple-500" />
        מצב ספירה
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-sm rounded-3xl border-2 border-[#E8E0D8] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#2A3D5A] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-purple-500" /> ספירת מלאי מהירה
              </span>
              {savedItems.length > 0 && (
                <span className="text-xs bg-[#7ABC98]/10 text-[#7ABC98] px-2 py-1 rounded-full font-medium">
                  {savedItems.length} עודכנו
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* SCAN PHASE */}
          {phase === 'scan' && (
            <div className="space-y-3">
              <div id="quick-count-scanner" className="rounded-2xl overflow-hidden" />
              <p className="text-xs text-center text-[#2A3D5A]/40">כוון את המצלמה לברקוד של המוצר</p>
            </div>
          )}

          {/* UPDATE PHASE */}
          {phase === 'update' && currentItem && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F5F0EA] rounded-2xl">
                <p className="font-bold text-[#2A3D5A] text-lg">{currentItem.name_he}</p>
                <p className="text-xs text-[#2A3D5A]/50">{AREA_LABELS[currentItem.work_area]} • {currentItem.unit}</p>
                <p className="text-xs text-[#2A3D5A]/30 mt-1">כמות קודמת: {currentItem.current_stock}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-[#2A3D5A]/50 text-center">עדכן כמות נוכחית</p>
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={() => setQty(q => Math.max(0, q - 1))}
                    className="h-14 w-14 rounded-2xl bg-[#F5F0EA] flex items-center justify-center hover:bg-[#E8E0D8] active:scale-95 transition-all"
                  >
                    <Minus className="h-6 w-6 text-[#2A3D5A]" />
                  </button>
                  <Input
                    type="number"
                    step="any"
                    value={qty}
                    onChange={e => setQty(Math.max(0, Number(e.target.value)))}
                    className="rounded-2xl border-2 border-[#E8E0D8] text-center text-3xl font-bold h-16 w-28"
                  />
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="h-14 w-14 rounded-2xl bg-[#7ABC98]/20 flex items-center justify-center hover:bg-[#7ABC98]/30 active:scale-95 transition-all"
                  >
                    <Plus className="h-6 w-6 text-[#7ABC98]" />
                  </button>
                </div>
                {diff !== 0 && (
                  <p className={cn("text-sm text-center font-semibold",
                    diff > 0 ? "text-[#7ABC98]" : "text-amber-500"
                  )}>
                    שינוי: {diff > 0 ? '+' : ''}{diff} {currentItem.unit}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveAndNext} disabled={saving}
                  className="flex-1 rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42] h-12 gap-2">
                  {saving
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><Check className="h-4 w-4" /> שמור וסרוק הבא</>
                  }
                </Button>
                <button onClick={startScanner}
                  className="h-12 w-12 rounded-2xl border-2 border-[#E8E0D8] flex items-center justify-center hover:border-[#7ABC98] transition-colors flex-shrink-0">
                  <Scan className="h-5 w-5 text-[#2A3D5A]/50" />
                </button>
              </div>
            </div>
          )}

          {/* NOT FOUND PHASE */}
          {phase === 'notfound' && (
            <div className="text-center space-y-4 py-4">
              <div className="h-14 w-14 mx-auto rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                <X className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-[#2A3D5A] font-medium">מוצר לא נמצא במערכת</p>
              <Button onClick={startScanner} className="rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42]">
                <Scan className="h-4 w-4 ml-2" /> נסה שוב
              </Button>
            </div>
          )}

          {/* Saved items log */}
          {savedItems.length > 0 && (
            <div className="border-t border-[#E8E0D8] pt-3 space-y-1.5">
              <p className="text-xs font-semibold text-[#2A3D5A]/40">עודכנו בסשן זה</p>
              {savedItems.slice(-5).reverse().map((item, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                  <span className="text-[#2A3D5A] font-medium truncate">{item.name_he}</span>
                  <span className="text-[#7ABC98] font-bold flex-shrink-0 mr-2">{item.new_stock} {item.unit}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}