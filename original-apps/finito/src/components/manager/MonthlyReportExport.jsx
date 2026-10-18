import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const AREA_LABELS = { floor: 'פלור', bar: 'בר', host: 'אירוח', kitchen: 'מטבח', cleaning: "מנהלים" };

export default function MonthlyReportExport() {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [exporting, setExporting] = useState(false);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MM/yyyy') };
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['inventory-all-report'],
    queryFn: () => base44.entities.InventoryItem.filter({ is_active: true }),
    enabled: open,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['orders-all-report'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 500),
    enabled: open,
  });

  const handleExport = () => {
    setExporting(true);
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1));
    const monthEnd = endOfMonth(new Date(year, month - 1));
    const monthLabel = format(monthStart, 'MM-yyyy');

    const monthOrders = allOrders.filter(o => {
      const d = new Date(o.created_date);
      return d >= monthStart && d <= monthEnd;
    });

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary by area
    const summaryRows = Object.keys(AREA_LABELS).map(area => {
      const areaItems = allItems.filter(i => i.work_area === area);
      const belowMin = areaItems.filter(i => i.min_stock != null && Number(i.current_stock) <= Number(i.min_stock));
      const ordersCount = monthOrders.filter(o => (o.items || []).some(it => it.work_area === area)).length;
      return {
        'מחלקה': AREA_LABELS[area],
        'סה"כ פריטים': areaItems.length,
        'מתחת למינימום': belowMin.length,
        'תקינים': areaItems.length - belowMin.length,
        'הזמנות בחודש': ordersCount,
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'סיכום לפי מחלקה');

    // Sheet 2: Full inventory
    const itemRows = allItems.map(item => {
      const current = Number(item.current_stock) || 0;
      const min = Number(item.min_stock) || 0;
      const max = Number(item.max_stock) || 0;
      const needed = (item.min_stock != null && current <= min) ? Math.max(0, max - current) : 0;
      return {
        'מחלקה': AREA_LABELS[item.work_area] || item.work_area,
        'שם פריט': item.name_he,
        'שם (אנגלית)': item.name_en || '',
        'יחידת מידה': item.unit || '',
        'מלאי נוכחי': item.current_stock ?? '',
        'מינימום': item.min_stock ?? '',
        'מקסימום': item.max_stock ?? '',
        'סטטוס': !item.min_stock ? '' : current <= min ? '⚠️ מתחת למינימום' : '✓ תקין',
        'כמות להזמנה': needed || '',
        'הערות בארגזים': (needed && item.box_enabled && item.units_per_box)
          ? `${Math.ceil(needed / item.units_per_box)} ${item.box_label || 'ארגז'}` : '',
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(itemRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'פירוט מלאי');

    // Sheet 3: Orders this month
    const orderRows = monthOrders.length === 0
      ? [{ 'הודעה': `לא בוצעו הזמנות בחודש ${monthLabel}` }]
      : monthOrders.flatMap(order =>
          (order.items || []).map(item => ({
            'מספר הזמנה': order.order_number || '',
            'ספק': order.supplier_name,
            'סטטוס': { draft: 'טיוטה', sent: 'נשלחה', received: 'התקבלה', partial: 'חלקי' }[order.status] || order.status,
            'מחלקה': AREA_LABELS[item.work_area] || item.work_area || '',
            'פריט': item.name_he,
            'יחידת מידה': item.unit || '',
            'כמות שהוזמנה': item.quantity_ordered || '',
            'כמות שהתקבלה': item.quantity_received || '',
            'תאריך': order.created_date ? format(new Date(order.created_date), 'dd/MM/yyyy') : '',
          }))
        );
    const ws3 = XLSX.utils.json_to_sheet(orderRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'הזמנות חודשיות');

    XLSX.writeFile(wb, `דוח_מלאי_${monthLabel}.xlsx`);
    setExporting(false);
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm"
        className="rounded-xl border-2 border-[#E8E0D8] hover:border-[#7ABC98] gap-2 text-[#2A3D5A]">
        <FileDown className="h-4 w-4" /> דוח חודשי
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-2 border-[#E8E0D8]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#2A3D5A] flex items-center gap-2">
              <FileDown className="h-5 w-5" /> ייצוא דוח חודשי
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <p className="text-xs text-[#2A3D5A]/50">בחר חודש לדוח</p>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="rounded-xl border-2 border-[#E8E0D8]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 bg-[#F5F0EA] rounded-2xl space-y-1.5 text-sm text-[#2A3D5A]/70">
              <p className="font-semibold text-[#2A3D5A] mb-2">הדוח יכלול 3 גיליונות:</p>
              <p>📊 סיכום מלאי לפי מחלקות</p>
              <p>📋 פירוט כל הפריטים + כמות להזמנה</p>
              <p>🛒 הזמנות שבוצעו בחודש הנבחר</p>
            </div>
            <Button onClick={handleExport} disabled={exporting} className="w-full rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42]">
              {exporting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <FileDown className="h-4 w-4 ml-2" />}
              ייצא לאקסל
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}