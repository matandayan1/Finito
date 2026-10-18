import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Loader2, CheckCircle2, Package, Send, MessageCircle,
  ClipboardList, ChevronDown, ChevronUp, Truck, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';

const AREA_LABELS = { floor: 'פלור', bar: 'בר', host: 'אירוח', kitchen: 'מטבח' };
const AREA_COLORS = {
  floor: 'bg-blue-50 text-blue-700 border-blue-200',
  bar: 'bg-purple-50 text-purple-700 border-purple-200',
  host: 'bg-amber-50 text-amber-700 border-amber-200',
  kitchen: 'bg-orange-50 text-orange-700 border-orange-200',
};

const STATUS_LABELS = {
  draft: { label: 'טיוטה', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  sent: { label: 'נשלחה', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  received: { label: 'התקבלה', color: 'bg-green-50 text-green-600 border-green-200' },
  partial: { label: 'התקבלה חלקית', color: 'bg-amber-50 text-amber-600 border-amber-200' },
};

function calcOrder(item) {
  const current = Number(item.current_stock) || 0;
  const max = Number(item.max_stock) || 0;
  const min = Number(item.min_stock) || 0;
  if (current >= min || max === 0) return null;
  const needed = max - current;
  if (item.box_enabled && item.units_per_box) {
    const upb = Number(item.units_per_box);
    const boxes = Math.ceil(needed / upb);
    return { needed, boxes, upb };
  }
  return { needed, boxes: null };
}

function getStockStatus(item) {
  const current = Number(item.current_stock);
  const min = Number(item.min_stock);
  const max = Number(item.max_stock);
  if (!item.min_stock && !item.max_stock) return 'unknown';
  if (current <= min) return 'critical';
  if (current < min * 1.3) return 'low';
  if (current >= max) return 'full';
  return 'ok';
}

// ── Create Order Dialog ──
function CreateOrderDialog({ open, onClose, criticalItems, onCreated }) {
  const [supplierName, setSupplierName] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState(() => {
    const s = {};
    criticalItems.forEach(item => {
      const order = calcOrder(item);
      s[item.id] = { selected: true, quantity: order ? order.needed : 0, item };
    });
    return s;
  });
  const [saving, setSaving] = useState(false);

  const toggleItem = (id) => {
    setSelectedItems(prev => ({ ...prev, [id]: { ...prev[id], selected: !prev[id].selected } }));
  };

  const updateQty = (id, val) => {
    setSelectedItems(prev => ({ ...prev, [id]: { ...prev[id], quantity: Number(val) } }));
  };

  const handleCreate = async () => {
    setSaving(true);
    const orderItems = Object.values(selectedItems)
      .filter(s => s.selected && s.quantity > 0)
      .map(s => ({
        item_id: s.item.id,
        name_he: s.item.name_he,
        name_en: s.item.name_en || '',
        unit: s.item.unit || '',
        work_area: s.item.work_area,
        quantity_ordered: s.quantity,
        quantity_received: 0,
      }));

    const orderNum = `PO-${Date.now().toString().slice(-6)}`;
    const created = await base44.entities.PurchaseOrder.create({
      order_number: orderNum,
      status: 'draft',
      supplier_name: supplierName,
      supplier_email: supplierEmail,
      supplier_phone: supplierPhone,
      items: orderItems,
      notes,
      total_items: orderItems.length,
    });
    onCreated(created);
    onClose();
    setSaving(false);
  };

  const selectedCount = Object.values(selectedItems).filter(s => s.selected).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-3xl border-2 border-[#E8E0D8] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[#2A3D5A] text-right">יצירת הזמנת רכש</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">

          {/* Supplier */}
          <div className="p-4 rounded-2xl bg-[#FFF8F0]/60 border-2 border-[#E8E0D8] space-y-3">
            <p className="text-sm font-semibold text-[#2A3D5A]">פרטי ספק</p>
            <div className="space-y-1">
              <Label className="text-xs text-[#2A3D5A]/50">שם ספק *</Label>
              <Input value={supplierName} onChange={e => setSupplierName(e.target.value)}
                placeholder="שם הספק" dir="rtl"
                className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">מייל ספק</Label>
                <Input value={supplierEmail} onChange={e => setSupplierEmail(e.target.value)}
                  placeholder="supplier@email.com" dir="ltr" type="email"
                  className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">וואטסאפ ספק</Label>
                <Input value={supplierPhone} onChange={e => setSupplierPhone(e.target.value)}
                  placeholder="05X-XXXXXXX" dir="ltr"
                  className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#2A3D5A]">פריטים להזמנה ({selectedCount} נבחרו)</p>
            {criticalItems.map(item => {
              const sel = selectedItems[item.id];
              return (
                <div key={item.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                  sel?.selected ? "border-[#7ABC98]/50 bg-[#7ABC98]/5" : "border-[#E8E0D8] bg-white opacity-60"
                )}>
                  <button type="button" onClick={() => toggleItem(item.id)}
                    className={cn("h-5 w-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all",
                      sel?.selected ? "bg-[#7ABC98] border-[#7ABC98]" : "border-[#E8E0D8]"
                    )}>
                    {sel?.selected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2A3D5A] truncate">{item.name_he}</p>
                    <p className="text-xs text-[#2A3D5A]/40">{AREA_LABELS[item.work_area]} • {item.unit}</p>
                  </div>
                  {sel?.selected && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Input type="number" min="0" value={sel.quantity}
                        onChange={e => updateQty(item.id, e.target.value)}
                        className="w-16 h-8 rounded-lg border-2 border-[#E8E0D8] text-center text-sm" />
                      <span className="text-xs text-[#2A3D5A]/50">{item.unit}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-[#2A3D5A]/50">הערות להזמנה</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="הערות נוספות לספק..." dir="rtl"
              className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={saving || !supplierName || selectedCount === 0}
              className="flex-1 rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'צור הזמנה'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}
              className="flex-1 rounded-2xl border-2 border-[#E8E0D8]">ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Receive Items Dialog ──
function ReceiveItemsDialog({ open, onClose, order, onReceived }) {
  const queryClient = useQueryClient();
  const [received, setReceived] = useState(() => {
    const r = {};
    order?.items?.forEach(item => {
      r[item.item_id] = item.quantity_received || 0;
    });
    return r;
  });
  const [saving, setSaving] = useState(false);

  const handleReceive = async () => {
    setSaving(true);
    const updatedItems = order.items.map(item => ({
      ...item,
      quantity_received: Number(received[item.item_id] || 0),
    }));

    const allReceived = updatedItems.every(item => item.quantity_received >= item.quantity_ordered);
    const someReceived = updatedItems.some(item => item.quantity_received > 0);

    await base44.entities.PurchaseOrder.update(order.id, {
      items: updatedItems,
      status: allReceived ? 'received' : (someReceived ? 'partial' : order.status),
      received_at: allReceived ? new Date().toISOString() : undefined,
    });

    // Update inventory for received items
    for (const item of updatedItems) {
      if (item.quantity_received > 0 && item.item_id) {
        const inventoryItems = await base44.entities.InventoryItem.filter({ is_active: true });
        const invItem = inventoryItems.find(i => i.id === item.item_id);
        if (invItem) {
          const newStock = (Number(invItem.current_stock) || 0) + Number(item.quantity_received);
          await base44.entities.InventoryItem.update(item.item_id, {
            current_stock: Math.min(newStock, Number(invItem.max_stock) || newStock)
          });
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-items-all'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    onReceived();
    onClose();
    setSaving(false);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl border-2 border-[#E8E0D8] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[#2A3D5A] text-right">
            קליטת הזמנה — {order.order_number}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-[#2A3D5A]/60">הכנס כמות שהתקבלה בפועל לכל פריט. הכמות תתווסף אוטומטית למלאי.</p>
          {order.items?.map(item => (
            <div key={item.item_id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#E8E0D8] bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#2A3D5A]">{item.name_he}</p>
                <p className="text-xs text-[#2A3D5A]/40">הוזמן: {item.quantity_ordered} {item.unit}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Input type="number" min="0" max={item.quantity_ordered}
                  value={received[item.item_id] || 0}
                  onChange={e => setReceived(prev => ({ ...prev, [item.item_id]: e.target.value }))}
                  className="w-16 h-8 rounded-lg border-2 border-[#E8E0D8] text-center text-sm" />
                <span className="text-xs text-[#2A3D5A]/50">{item.unit}</span>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <Button onClick={handleReceive} disabled={saving}
              className="flex-1 rounded-2xl bg-[#7ABC98] hover:bg-[#6aac88]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '✓ עדכן מלאי'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-2xl border-2 border-[#E8E0D8]">ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Order Card ──
function OrderCard({ order, onReceive }) {
  const [expanded, setExpanded] = useState(false);
  const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.draft;
  const isActionable = order.status === 'sent' || order.status === 'draft';

  const buildOrderText = () => {
    if (!order.items?.length) return '';
    const lines = order.items.map(item =>
      `• ${item.name_he}: ${item.quantity_ordered} ${item.unit}`
    ).join('\n');
    return `הזמנת רכש ${order.order_number}\nתאריך: ${format(new Date(order.created_date), 'dd/MM/yyyy')}\n\n${lines}${order.notes ? `\n\nהערות: ${order.notes}` : ''}`;
  };

  const sendWhatsApp = () => {
    const phone = order.supplier_phone?.replace(/\D/g, '');
    const text = encodeURIComponent(buildOrderText());
    const url = phone
      ? `https://wa.me/972${phone.replace(/^0/, '')}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
    if (order.status === 'draft') {
      base44.entities.PurchaseOrder.update(order.id, { status: 'sent', sent_at: new Date().toISOString() });
    }
  };

  const sendEmail = async () => {
    if (!order.supplier_email) return;
    const text = buildOrderText();
    await base44.integrations.Core.SendEmail({
      to: order.supplier_email,
      subject: `הזמנת רכש ${order.order_number} - פיניטו`,
      body: text.replace(/\n/g, '<br>'),
    });
    if (order.status === 'draft') {
      await base44.entities.PurchaseOrder.update(order.id, { status: 'sent', sent_at: new Date().toISOString() });
    }
    alert('המייל נשלח בהצלחה!');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white rounded-2xl border-2 shadow-sm overflow-hidden",
        order.status === 'received' ? "border-green-100" : "border-[#E8E0D8]"
      )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
            order.status === 'received' ? "bg-green-50" : "bg-[#FFF8F0]"
          )}>
            {order.status === 'received'
              ? <CheckCircle2 className="h-5 w-5 text-green-500" />
              : <ClipboardList className="h-5 w-5 text-[#2A3D5A]/40" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-[#2A3D5A]">{order.order_number}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-lg border font-medium", statusInfo.color)}>
                {statusInfo.label}
              </span>
            </div>
            <p className="text-sm text-[#2A3D5A]/60 mt-0.5">{order.supplier_name}</p>
            <p className="text-xs text-[#2A3D5A]/35 mt-0.5">
              {format(new Date(order.created_date), 'dd/MM/yyyy HH:mm')}
              {order.sent_at && ` • נשלחה: ${format(new Date(order.sent_at), 'dd/MM HH:mm')}`}
              {order.received_at && ` • התקבלה: ${format(new Date(order.received_at), 'dd/MM HH:mm')}`}
            </p>
          </div>
          <button onClick={() => setExpanded(e => !e)}
            className="h-8 w-8 rounded-xl flex items-center justify-center text-[#2A3D5A]/30 hover:bg-[#FFF8F0] transition-all">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Action buttons */}
        {order.status !== 'received' && (
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={sendWhatsApp}
              className="rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs gap-1 flex-1">
              <MessageCircle className="h-3.5 w-3.5" />
              שלח ב-WhatsApp
            </Button>
            {order.supplier_email && (
              <Button size="sm" variant="outline" onClick={sendEmail}
                className="rounded-xl border-2 border-[#E8E0D8] text-xs gap-1 flex-1">
                <Send className="h-3.5 w-3.5" />
                שלח מייל
              </Button>
            )}
            {isActionable && (
              <Button size="sm" onClick={() => onReceive(order)}
                className="rounded-xl bg-[#7ABC98] hover:bg-[#6aac88] text-white text-xs gap-1 flex-1">
                <Truck className="h-3.5 w-3.5" />
                קלוט סחורה
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Expanded items */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t-2 border-[#E8E0D8]">
            <div className="p-4 space-y-2 bg-[#FFF8F0]/50">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-1.5 py-0.5 rounded border", AREA_COLORS[item.work_area])}>
                      {AREA_LABELS[item.work_area]}
                    </span>
                    <span className="text-[#2A3D5A]">{item.name_he}</span>
                  </div>
                  <div className="text-right text-[#2A3D5A]/60 text-xs">
                    <span className="font-medium text-[#2A3D5A]">{item.quantity_ordered} {item.unit}</span>
                    {item.quantity_received > 0 && (
                      <span className="text-green-600 mr-2">✓ התקבלו: {item.quantity_received}</span>
                    )}
                  </div>
                </div>
              ))}
              {order.notes && (
                <p className="text-xs text-[#2A3D5A]/50 mt-2 pt-2 border-t border-[#E8E0D8]">
                  הערות: {order.notes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Export ──
export default function PurchaseOrders() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState(null);

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 50),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => base44.entities.InventoryItem.filter({ is_active: true }),
  });

  const criticalItems = allItems.filter(item => {
    const status = getStockStatus(item);
    return status === 'critical' || status === 'low';
  });

  const activeOrders = orders.filter(o => o.status !== 'received');
  const completedOrders = orders.filter(o => o.status === 'received');

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-[#E8E0D8] shadow-sm">
        <div>
          <p className="font-semibold text-[#2A3D5A]">הזמנות רכש</p>
          <p className="text-xs text-[#2A3D5A]/50 mt-0.5">
            {criticalItems.length > 0
              ? `${criticalItems.length} פריטים במלאי קריטי / נמוך`
              : 'כל הפריטים תקינים'}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={criticalItems.length === 0}
          className="rounded-xl bg-[#2A3D5A] hover:bg-[#1e2d42] gap-2">
          <Plus className="h-4 w-4" />
          הזמנה חדשה
        </Button>
      </div>

      {/* Critical items summary */}
      {criticalItems.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-sm font-semibold text-red-700">פריטים הדורשים הזמנה:</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {criticalItems.map(item => (
              <span key={item.id} className="text-xs px-2 py-1 rounded-lg bg-white border border-red-200 text-red-700 font-medium">
                {item.name_he} ({item.current_stock ?? 0}/{item.min_stock} {item.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active orders */}
      {loadingOrders ? (
        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#7ABC98]" /></div>
      ) : (
        <div className="space-y-3">
          {activeOrders.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#2A3D5A]/60">הזמנות פעילות ({activeOrders.length})</p>
              {activeOrders.map(order => (
                <OrderCard key={order.id} order={order} onReceive={setReceivingOrder} />
              ))}
            </div>
          )}

          {activeOrders.length === 0 && completedOrders.length === 0 && (
            <div className="text-center py-16">
              <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-[#FFF8F0] border-2 border-[#E8E0D8] flex items-center justify-center">
                <Package className="h-7 w-7 text-[#2A3D5A]/25" />
              </div>
              <p className="text-[#2A3D5A]/40 font-medium">אין הזמנות רכש עדיין</p>
              <p className="text-xs text-[#2A3D5A]/30 mt-1">צור הזמנה חדשה מפריטים שחסרים</p>
            </div>
          )}

          {completedOrders.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#2A3D5A]/40">הזמנות שהתקבלו ({completedOrders.length})</p>
              {completedOrders.slice(0, 5).map(order => (
                <OrderCard key={order.id} order={order} onReceive={setReceivingOrder} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      {createOpen && (
        <CreateOrderDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          criticalItems={criticalItems}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })}
        />
      )}

      {/* Receive Dialog */}
      {receivingOrder && (
        <ReceiveItemsDialog
          open={!!receivingOrder}
          onClose={() => setReceivingOrder(null)}
          order={receivingOrder}
          onReceived={() => setReceivingOrder(null)}
        />
      )}
    </div>
  );
}