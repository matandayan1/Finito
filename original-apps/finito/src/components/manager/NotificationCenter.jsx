import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, X, AlertTriangle, ShoppingCart, CheckCircle2, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const AREA_LABELS = { floor: 'פלור', bar: 'בר', host: 'אירוח', kitchen: 'מטבח', cleaning: "מנהלים" };

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);

  const [dismissedStock, setDismissedStock] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_stock_notifs') || '[]'); } catch { return []; }
  });
  const [readOrders, setReadOrders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('read_order_notifs') || '[]'); } catch { return []; }
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['low-stock-notifs'],
    queryFn: () => base44.entities.InventoryItem.filter({ is_active: true }),
    refetchInterval: 300000, // 5 minutes
    staleTime: 120000,
  });

  const { data: openAlerts = [] } = useQuery({
    queryKey: ['open-alerts-notif'],
    queryFn: () => base44.entities.InventoryAlert.filter({ status: 'open' }),
    refetchInterval: 300000, // 5 minutes
    staleTime: 120000,
  });

  const { data: recentOrders = [] } = useQuery({
    queryKey: ['recent-orders-notif'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 20),
    select: (orders) => orders.filter(o => o.status === 'sent' || o.status === 'received'),
    refetchInterval: 300000, // 5 minutes
    staleTime: 120000,
  });

  const lowStockItems = allItems.filter(item =>
    item.min_stock != null && item.current_stock != null &&
    Number(item.current_stock) <= Number(item.min_stock) &&
    !dismissedStock.includes(item.id)
  );

  const unreadOrders = recentOrders.filter(o => !readOrders.includes(o.id));
  const totalUnread = lowStockItems.length + openAlerts.length + unreadOrders.length;

  const dismissStock = (id) => {
    const updated = [...dismissedStock, id];
    setDismissedStock(updated);
    localStorage.setItem('dismissed_stock_notifs', JSON.stringify(updated));
  };

  const markOrderRead = (id) => {
    const updated = [...readOrders, id];
    setReadOrders(updated);
    localStorage.setItem('read_order_notifs', JSON.stringify(updated));
  };

  const markAllRead = () => {
    const newDismissed = [...dismissedStock, ...lowStockItems.map(i => i.id)];
    const newRead = [...readOrders, ...unreadOrders.map(o => o.id)];
    setDismissedStock(newDismissed);
    setReadOrders(newRead);
    localStorage.setItem('dismissed_stock_notifs', JSON.stringify(newDismissed));
    localStorage.setItem('read_order_notifs', JSON.stringify(newRead));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 rounded-2xl flex items-center justify-center border-2 border-[#E8E0D8] bg-white hover:border-[#7ABC98] transition-all"
      >
        <Bell className="h-4 w-4 text-[#2A3D5A]" />
        {totalUnread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-11 z-50 w-80 bg-white rounded-2xl border-2 border-[#E8E0D8] shadow-xl overflow-hidden"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#E8E0D8]">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#2A3D5A]" />
                  <span className="font-semibold text-[#2A3D5A]">התראות</span>
                  {totalUnread > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{totalUnread}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {totalUnread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-[#7ABC98] hover:underline">סמן הכל</button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-[#2A3D5A]/30 hover:text-[#2A3D5A]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-[#F5F0EA]">
                {totalUnread === 0 && openAlerts.length === 0 ? (
                  <div className="py-10 text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-[#7ABC98] mb-2" />
                    <p className="text-sm text-[#2A3D5A]/40">אין התראות חדשות</p>
                  </div>
                ) : (
                  <>
                    {lowStockItems.map(item => (
                      <div key={item.id} className="flex items-start gap-3 p-3 hover:bg-[#FFF8F0] transition-colors">
                        <div className="h-8 w-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#2A3D5A]">מלאי נמוך: {item.name_he}</p>
                          <p className="text-xs text-[#2A3D5A]/50 mt-0.5">
                            נוכחי: {item.current_stock} | מינימום: {item.min_stock} {item.unit}
                          </p>
                          <p className="text-xs text-[#2A3D5A]/30">{AREA_LABELS[item.work_area]}</p>
                        </div>
                        <button onClick={() => dismissStock(item.id)} className="text-[#2A3D5A]/20 hover:text-[#2A3D5A]/50 flex-shrink-0 mt-0.5">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {openAlerts.map(alert => (
                      <div key={alert.id} className="flex items-start gap-3 p-3 hover:bg-[#FFF8F0] transition-colors">
                        <div className="h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#2A3D5A]">דיווח חסר: {alert.item_name_he}</p>
                          {alert.note && <p className="text-xs text-[#2A3D5A]/50 mt-0.5">{alert.note}</p>}
                          {alert.reported_by && <p className="text-xs text-[#2A3D5A]/30">ע"י: {alert.reported_by}</p>}
                        </div>
                      </div>
                    ))}

                    {unreadOrders.map(order => (
                      <div key={order.id} className="flex items-start gap-3 p-3 hover:bg-[#FFF8F0] transition-colors">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ShoppingCart className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#2A3D5A]">
                            {order.status === 'received' ? '✅ הזמנה התקבלה' : '📦 הזמנה נשלחה'}
                          </p>
                          <p className="text-xs text-[#2A3D5A]/50 mt-0.5">{order.supplier_name}</p>
                          {order.created_date && (
                            <p className="text-xs text-[#2A3D5A]/30">{format(new Date(order.created_date), 'dd/MM HH:mm')}</p>
                          )}
                        </div>
                        <button onClick={() => markOrderRead(order.id)} className="text-[#2A3D5A]/20 hover:text-[#2A3D5A]/50 flex-shrink-0 mt-0.5">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}