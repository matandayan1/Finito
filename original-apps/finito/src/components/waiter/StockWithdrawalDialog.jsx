import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Plus, Minus, Warehouse, Check, Loader2, User } from 'lucide-react';
import { cn } from "@/lib/utils";
import ImageLightbox from '@/components/ui/ImageLightbox';

const WORK_AREAS = ['floor', 'bar', 'host', 'kitchen'];
const AREA_LABELS = { floor: 'פלור', bar: 'בר', host: 'אירוח', kitchen: 'מטבח' };

export default function StockWithdrawalDialog({ open, onClose }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('area'); // 'area' | 'items' | 'sign'
  const [selectedArea, setSelectedArea] = useState(null);
  const [picked, setPicked] = useState({});
  const [signerName, setSignerName] = useState(() => localStorage.getItem('worker_name') || '');
  const [saving, setSaving] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory-items-withdrawal', selectedArea],
    queryFn: () => base44.entities.InventoryItem.filter({ work_area: selectedArea, is_active: true }, 'sort_order', 100),
    enabled: !!selectedArea,
  });

  const totalPicked = Object.values(picked).filter(v => v > 0).length;

  const setQty = (itemId, qty) => {
    setPicked(prev => {
      const updated = { ...prev, [itemId]: Math.max(0, qty) };
      if (updated[itemId] === 0) delete updated[itemId];
      return updated;
    });
  };

  const handleConfirm = async () => {
    if (!signerName.trim() || totalPicked === 0) return;
    setSaving(true);
    localStorage.setItem('worker_name', signerName.trim());

    for (const [itemId, qty] of Object.entries(picked)) {
      if (qty <= 0) continue;
      const item = items.find(i => i.id === itemId);
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
        updated_by: signerName.trim(),
        source: 'manual',
        notes: `הוצאה ידנית — מחלקת ${AREA_LABELS[selectedArea]}`,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    setSaving(false);
    handleClose(true);
  };

  const handleClose = (success = false) => {
    setStep('area');
    setSelectedArea(null);
    setPicked({});
    setSaving(false);
    onClose(success);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm rounded-3xl border-2 border-[#E8E0D8] h-[85vh] flex flex-col overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[#2A3D5A] flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-blue-500" />
            הוצאה מהמחסן
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: Area */}
        {step === 'area' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <p className="text-sm text-[#2A3D5A]/50 text-right">בחר את המחלקה שאליה לוקחים</p>
            <div className="grid grid-cols-2 gap-3">
              {WORK_AREAS.map(area => (
                <button
                  key={area}
                  onClick={() => setSelectedArea(area)}
                  className={cn(
                    "py-4 rounded-2xl border-2 font-medium text-sm transition-all",
                    selectedArea === area
                      ? "bg-[#2A3D5A] text-white border-[#2A3D5A]"
                      : "border-[#E8E0D8] text-[#2A3D5A]/70 hover:border-[#7ABC98]"
                  )}
                >
                  {AREA_LABELS[area]}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setStep('items')}
              disabled={!selectedArea}
              className="w-full rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42] h-12"
            >
              המשך
            </Button>
          </div>
        )}

        {/* STEP 2: Items */}
        {step === 'items' && (
          <div className="space-y-3 flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep('area')} className="text-xs text-[#2A3D5A]/40 hover:text-[#2A3D5A]">← חזור</button>
              <p className="text-sm font-semibold text-[#2A3D5A]">{AREA_LABELS[selectedArea]}</p>
            </div>
            <p className="text-xs text-[#2A3D5A]/40 text-right">סמן כמה מכל פריט לקחת</p>

            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#7ABC98]" /></div>
            ) : items.length === 0 ? (
              <p className="text-center text-sm text-[#2A3D5A]/40 py-8">אין פריטי מלאי במחלקה זו</p>
            ) : (
              <div className="space-y-2 overflow-y-auto flex-1">
                {items.map(item => {
                  const qty = picked[item.id] || 0;
                  const stockKnown = item.current_stock !== null && item.current_stock !== undefined;
                  const outOfStock = stockKnown && Number(item.current_stock) === 0;
                  return (
                    <div key={item.id} className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all",
                      qty > 0 ? "border-[#7ABC98] bg-[#7ABC98]/5" : "border-[#E8E0D8]"
                    )}>
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name_he} onClick={() => setLightboxUrl(item.image_url)} className="h-8 w-8 rounded-lg object-cover flex-shrink-0 cursor-zoom-in active:scale-95 transition-transform" />
                        : <div className="h-8 w-8 rounded-lg bg-[#E8E0D8] flex items-center justify-center flex-shrink-0">
                            <Package className="h-4 w-4 text-[#2A3D5A]/30" />
                          </div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2A3D5A] truncate">{item.name_he}</p>
                        <p className="text-xs text-[#2A3D5A]/40">
                          {stockKnown ? `${item.current_stock} ${item.unit || ''}` : `— ${item.unit || ''}`}
                          {outOfStock && <span className="text-red-400 mr-1"> · אין מלאי</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setQty(item.id, qty - 1)} disabled={qty === 0}
                          className="h-7 w-7 rounded-lg bg-[#E8E0D8] flex items-center justify-center hover:bg-[#d4ccbf] disabled:opacity-30 active:scale-95 transition-all">
                          <Minus className="h-3 w-3 text-[#2A3D5A]" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-[#2A3D5A]">{qty}</span>
                        <button onClick={() => setQty(item.id, qty + 1)}
                          className="h-7 w-7 rounded-lg bg-[#7ABC98]/20 flex items-center justify-center hover:bg-[#7ABC98]/30 active:scale-95 transition-all">
                          <Plus className="h-3 w-3 text-[#7ABC98]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              onClick={() => setStep('sign')}
              disabled={totalPicked === 0}
              className="w-full rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42] h-12"
            >
              המשך לחתימה ({totalPicked} פריטים)
            </Button>
          </div>
        )}

        {/* STEP 3: Signature */}
        {step === 'sign' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep('items')} className="text-xs text-[#2A3D5A]/40 hover:text-[#2A3D5A]">← חזור</button>
              <p className="text-sm font-semibold text-[#2A3D5A]">אישור וחתימה</p>
            </div>

            {/* Summary */}
            <div className="bg-[#F5F0EA] rounded-2xl p-3 space-y-1 max-h-36 overflow-y-auto">
              {Object.entries(picked).filter(([, qty]) => qty > 0).map(([itemId, qty]) => {
                const item = items.find(i => i.id === itemId);
                if (!item) return null;
                return (
                  <div key={itemId} className="flex justify-between text-sm">
                    <span className="font-medium text-[#2A3D5A]">{qty} {item.unit}</span>
                    <span className="text-[#2A3D5A]/70">{item.name_he}</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[#2A3D5A]/50 flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> חתימה — שם האחראי על ההוצאה
              </p>
              <Input
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="שמך..."
                dir="rtl"
                className="rounded-2xl border-2 border-[#E8E0D8] focus:border-[#7ABC98] h-12 text-center text-base font-medium"
                autoFocus
              />
            </div>

            <div className="p-3 bg-[#F5F0EA] rounded-2xl text-center">
              <p className="text-xs text-[#2A3D5A]/40">אני מאשר/ת שלקחתי את הפריטים הנ"ל מהמחסן</p>
              <p className="font-bold text-[#2A3D5A] mt-1">{signerName || '...'}</p>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!signerName.trim() || saving}
              className="w-full rounded-2xl bg-[#7ABC98] hover:bg-[#6aac88] h-12 text-white font-semibold"
            >
              {saving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><Check className="h-4 w-4 ml-2" /> אשר הוצאה מהמחסן</>
              }
            </Button>
          </div>
        )}
      </DialogContent>
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </Dialog>
  );
}