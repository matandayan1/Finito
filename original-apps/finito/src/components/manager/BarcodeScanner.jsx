import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { Scan, Package, Plus, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from "@/lib/utils";

const WORK_AREAS = ['floor', 'bar', 'host', 'kitchen', 'cleaning'];
const AREA_LABELS = { floor: 'פלור', bar: 'בר', host: 'אירוח', kitchen: 'מטבח', cleaning: "מנהלים" };

export default function BarcodeScanner({ activeArea = 'floor' }) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState(null);
  const [foundItem, setFoundItem] = useState(null);
  const [mode, setMode] = useState('update'); // 'update' | 'add'
  const [newQty, setNewQty] = useState('');
  const [newItem, setNewItem] = useState({ name_he: '', unit: '', current_stock: '', work_area: activeArea });
  const [saving, setSaving] = useState(false);
  const scannerRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!scannerOpen) return;

    let scanner = null;
    let cancelled = false;

    const timer = setTimeout(() => {
      if (cancelled) return;
      const el = document.getElementById('barcode-reader-div');
      if (!el) return;

      scanner = new Html5QrcodeScanner(
        'barcode-reader-div',
        { fps: 10, qrbox: { width: 250, height: 150 }, supportedScanTypes: [0, 1], rememberLastUsedCamera: true },
        false
      );

      scanner.render(
        async (decodedText) => {
          if (cancelled) return;
          try { await scanner.clear(); } catch {}
          setScannerOpen(false);

          const allItems = await base44.entities.InventoryItem.filter({ is_active: true });
          const found = allItems.find(i =>
            i.barcode === decodedText ||
            i.name_en?.toLowerCase() === decodedText.toLowerCase()
          );

          setScannedCode(decodedText);
          if (found) {
            setFoundItem(found);
            setNewQty(String(found.current_stock ?? ''));
            setMode('update');
          } else {
            setFoundItem(null);
            setMode('add');
            setNewItem({ name_he: '', unit: '', current_stock: '', work_area: activeArea, barcode: decodedText });
          }
          setResultOpen(true);
        },
        () => {}
      );

      scannerRef.current = scanner;
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scannerOpen, activeArea]);

  const handleUpdateQty = async () => {
    if (!foundItem || newQty === '') return;
    setSaving(true);
    await base44.entities.InventoryItem.update(foundItem.id, { current_stock: Number(newQty) });
    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    setSaving(false);
    setResultOpen(false);
    setScannedCode(null);
    setFoundItem(null);
  };

  const handleAddNew = async () => {
    if (!newItem.name_he) return;
    setSaving(true);
    await base44.entities.InventoryItem.create({
      ...newItem,
      is_active: true,
      current_stock: Number(newItem.current_stock) || 0,
    });
    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    setSaving(false);
    setResultOpen(false);
    setScannedCode(null);
  };

  const closeResult = () => {
    setResultOpen(false);
    setScannedCode(null);
    setFoundItem(null);
  };

  return (
    <>
      <Button
        onClick={() => setScannerOpen(true)}
        variant="outline"
        className="rounded-xl border-2 border-[#E8E0D8] hover:border-[#7ABC98] gap-2 text-[#2A3D5A]"
      >
        <Scan className="h-4 w-4" />
        סרוק ברקוד
      </Button>

      {/* Scanner Overlay — native, not Radix Dialog */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E0D8]">
              <button
                onClick={() => {
                  scannerRef.current?.clear().catch(() => {});
                  setScannerOpen(false);
                }}
                className="text-sm text-[#2A3D5A]/50 hover:text-[#2A3D5A] px-3 py-1.5 rounded-xl border border-[#E8E0D8]"
              >
                סגור
              </button>
              <h2 className="font-semibold text-[#2A3D5A] flex items-center gap-2">
                <Scan className="h-5 w-5" /> סריקת ברקוד
              </h2>
            </div>
            <div id="barcode-reader-div" className="w-full" />
            <p className="text-xs text-center text-[#2A3D5A]/40 pb-4">כוון את המצלמה לברקוד של המוצר</p>
          </div>
        </div>
      )}

      {/* Update Qty Dialog */}
      <Dialog open={resultOpen && mode === 'update'} onOpenChange={closeResult}>
        <DialogContent className="max-w-sm rounded-3xl border-2 border-[#E8E0D8]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#2A3D5A] flex items-center gap-2">
              <Package className="h-5 w-5" /> עדכון כמות
            </DialogTitle>
          </DialogHeader>
          {foundItem && (
            <div className="space-y-4">
              <div className="p-3 bg-[#F5F0EA] rounded-2xl">
                <p className="font-semibold text-[#2A3D5A]">{foundItem.name_he}</p>
                <p className="text-xs text-[#2A3D5A]/50 mt-0.5">
                  {AREA_LABELS[foundItem.work_area]} • כמות נוכחית: {foundItem.current_stock} {foundItem.unit}
                </p>
                <p className="text-xs text-[#2A3D5A]/30 mt-0.5 font-mono">{scannedCode}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">כמות חדשה ({foundItem.unit})</Label>
                <Input
                  type="number"
                  value={newQty}
                  onChange={e => setNewQty(e.target.value)}
                  className="rounded-xl border-2 border-[#E8E0D8] text-center text-xl h-14 font-bold"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdateQty} disabled={saving || newQty === ''} className="flex-1 rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42]">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'עדכן מלאי'}
                </Button>
                <Button variant="outline" onClick={closeResult} className="flex-1 rounded-2xl border-2 border-[#E8E0D8]">
                  ביטול
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Product Dialog */}
      <Dialog open={resultOpen && mode === 'add'} onOpenChange={closeResult}>
        <DialogContent className="max-w-sm rounded-3xl border-2 border-[#E8E0D8] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#2A3D5A] flex items-center gap-2">
              <Plus className="h-5 w-5" /> הוספת מוצר חדש
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-sm text-amber-700">הברקוד לא נמצא במערכת</p>
              <p className="text-xs font-mono text-amber-600 mt-1">{scannedCode}</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">שם המוצר *</Label>
                <Input
                  value={newItem.name_he}
                  onChange={e => setNewItem(p => ({ ...p, name_he: e.target.value }))}
                  placeholder="שם המוצר בעברית..."
                  dir="rtl"
                  className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">מחלקה</Label>
                <div className="flex flex-wrap gap-1.5">
                  {WORK_AREAS.map(area => (
                    <button key={area} type="button"
                      onClick={() => setNewItem(p => ({ ...p, work_area: area }))}
                      className={cn(
                        "px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all",
                        newItem.work_area === area
                          ? "bg-[#2A3D5A] text-white border-[#2A3D5A]"
                          : "border-[#E8E0D8] text-[#2A3D5A]/60 hover:border-[#7ABC98]"
                      )}>
                      {AREA_LABELS[area]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-[#2A3D5A]/50">יחידת מידה</Label>
                  <Input
                    value={newItem.unit}
                    onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
                    placeholder="חבילה, בקבוק..."
                    dir="rtl"
                    className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[#2A3D5A]/50">כמות נוכחית</Label>
                  <Input
                    type="number"
                    value={newItem.current_stock}
                    onChange={e => setNewItem(p => ({ ...p, current_stock: e.target.value }))}
                    placeholder="0"
                    className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98] text-center"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddNew} disabled={saving || !newItem.name_he} className="flex-1 rounded-2xl bg-[#7ABC98] hover:bg-[#6aac88]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'הוסף מוצר'}
              </Button>
              <Button variant="outline" onClick={closeResult} className="flex-1 rounded-2xl border-2 border-[#E8E0D8]">
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}