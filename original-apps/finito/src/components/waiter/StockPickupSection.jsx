import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Package, Plus, Minus, ChevronDown, ChevronUp, Warehouse, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import ImageLightbox from '@/components/ui/ImageLightbox';

export default function StockPickupSection({ workArea, onPickupChange }) {
  const [expanded, setExpanded] = useState(false);
  const [picked, setPicked] = useState({});
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ['inventory-items-pickup', workArea],
    queryFn: () => base44.entities.InventoryItem.filter({ work_area: workArea, is_active: true }, 'sort_order', 100),
  });

  const totalPicked = Object.values(picked).filter(v => v > 0).length;

  const setQty = (itemId, qty) => {
    const updated = { ...picked, [itemId]: Math.max(0, qty) };
    if (updated[itemId] === 0) delete updated[itemId];
    setPicked(updated);
    onPickupChange?.(updated);
  };

  return (
    <React.Fragment>
      {/* Lightbox with zoom & pan */}
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      <div className="rounded-2xl border-2 border-[#E8E0D8] bg-white overflow-hidden shadow-sm">
        {/* Header */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between p-4 text-right hover:bg-[#FFF8F0] transition-colors"
        >
          <div className="flex items-center gap-2">
            {totalPicked > 0 && (
              <span className="h-5 w-5 rounded-full bg-[#7ABC98] text-white text-xs flex items-center justify-center font-bold">
                {totalPicked}
              </span>
            )}
            {expanded ? <ChevronUp className="h-4 w-4 text-[#2A3D5A]/40" /> : <ChevronDown className="h-4 w-4 text-[#2A3D5A]/40" />}
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="font-semibold text-[#2A3D5A] text-sm">מילוי מלאי מהמחסן</p>
              <p className="text-xs text-[#2A3D5A]/40 mt-0.5">
                {totalPicked > 0 ? `${totalPicked} פריטים נבחרו` : 'לחץ לסמן מה לקחת מהמחסן'}
              </p>
            </div>
            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Warehouse className="h-4 w-4 text-blue-500" />
            </div>
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2 border-t border-[#E8E0D8]">
                <p className="text-xs text-[#2A3D5A]/40 pt-3 text-right">
                  סמן כמה מכל פריט לקחת מהמחסן — המלאי יעודכן אוטומטית
                </p>
                {items.length === 0 ? (
                  <div className="text-center py-6 text-[#2A3D5A]/30 text-sm">
                    אין פריטי מלאי מוגדרים למחלקה זו
                  </div>
                ) : (
                  items.map(item => {
                    const qty = picked[item.id] || 0;
                    const stockKnown = item.current_stock !== null && item.current_stock !== undefined;
                    const outOfStock = stockKnown && Number(item.current_stock) === 0;
                    return (
                      <div key={item.id} className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                        qty > 0 ? "border-[#7ABC98] bg-[#7ABC98]/5" : "border-[#E8E0D8] bg-[#F5F0EA]/40"
                      )}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {item.image_url
                            ? <img
                                src={item.image_url}
                                alt={item.name_he}
                                className="h-10 w-10 rounded-lg object-cover flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                                onClick={() => setLightboxUrl(item.image_url)}
                              />
                            : <div className="h-10 w-10 rounded-lg bg-[#E8E0D8] flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-[#2A3D5A]/30" />
                              </div>
                          }
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#2A3D5A] leading-tight break-words">{item.name_he}</p>
                            <p className="text-xs text-[#2A3D5A]/40 mt-0.5">
                              {stockKnown ? `במחסן: ${item.current_stock} ${item.unit || ''}` : 'במחסן: לא ידוע'}
                              {outOfStock && <span className="text-red-400 mr-1"> · אין מלאי!</span>}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setQty(item.id, qty - 1)}
                            disabled={qty === 0}
                            className="h-8 w-8 rounded-xl bg-[#E8E0D8] flex items-center justify-center hover:bg-[#d4ccbf] active:scale-95 transition-all disabled:opacity-30"
                          >
                            <Minus className="h-3.5 w-3.5 text-[#2A3D5A]" />
                          </button>
                          <Input
                            type="number"
                            value={qty || ''}
                            onChange={e => setQty(item.id, Number(e.target.value))}
                            placeholder="0"
                            className="h-8 w-14 rounded-xl border-2 border-[#E8E0D8] text-center text-sm font-bold p-0"
                          />
                          <button
                            onClick={() => setQty(item.id, qty + 1)}
                            className="h-8 w-8 rounded-xl bg-[#7ABC98]/20 flex items-center justify-center hover:bg-[#7ABC98]/30 active:scale-95 transition-all"
                          >
                            <Plus className="h-3.5 w-3.5 text-[#7ABC98]" />
                          </button>
                          <span className="text-xs text-[#2A3D5A]/40 w-10 text-right">{item.unit}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </React.Fragment>
  );
}