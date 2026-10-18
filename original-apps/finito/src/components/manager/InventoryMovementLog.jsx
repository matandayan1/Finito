import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from "@/lib/utils";

const SOURCE_LABELS = { manual: 'ידני', barcode: 'ברקוד', quick_count: 'ספירה מהירה' };

export default function InventoryMovementLog() {
  const [selectedItemId, setSelectedItemId] = useState('all');

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => base44.entities.InventoryMovement.list('-created_date', 300),
    refetchInterval: 30000,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ['inventory-items-for-log'],
    queryFn: () => base44.entities.InventoryItem.filter({ is_active: true }),
  });

  const filtered = selectedItemId === 'all'
    ? movements
    : movements.filter(m => m.item_id === selectedItemId);

  const chartData = selectedItemId !== 'all'
    ? [...filtered].reverse().map(m => ({
        תאריך: m.created_date ? format(new Date(m.created_date), 'dd/MM HH:mm') : '',
        מלאי: m.new_stock,
      }))
    : [];

  const selectedItem = allItems.find(i => i.id === selectedItemId);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#7ABC98]" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap p-4 bg-white rounded-2xl border-2 border-[#E8E0D8] shadow-sm">
        <p className="text-sm font-semibold text-[#2A3D5A]">
          {movements.length} תנועות מלאי סה"כ
        </p>
        <Select value={selectedItemId} onValueChange={setSelectedItemId}>
          <SelectTrigger className="w-52 rounded-xl border-2 border-[#E8E0D8]">
            <SelectValue placeholder="כל הפריטים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הפריטים</SelectItem>
            {allItems.map(item => (
              <SelectItem key={item.id} value={item.id}>{item.name_he}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart for specific item */}
      {selectedItemId !== 'all' && chartData.length > 1 && (
        <div className="bg-white rounded-2xl border-2 border-[#E8E0D8] p-4 shadow-sm">
          <p className="text-sm font-semibold text-[#2A3D5A] mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#7ABC98]" />
            היסטוריית מלאי: {selectedItem?.name_he}
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F0EA" />
              <XAxis dataKey="תאריך" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #E8E0D8', fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="מלאי"
                stroke="#7ABC98"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#7ABC98', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-[#2A3D5A]/20" />
          <p className="text-[#2A3D5A]/40 font-medium">אין תנועות מלאי עדיין</p>
          <p className="text-xs text-[#2A3D5A]/25 mt-1">תנועות ייצרו בעת עדכון כמויות</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m, i) => {
            const isPos = (m.change_amount || 0) > 0;
            const isNeg = (m.change_amount || 0) < 0;
            return (
              <div key={m.id || i} className="flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-[#E8E0D8] shadow-sm">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-base",
                  isPos ? "bg-green-50 text-green-600" : isNeg ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-400"
                )}>
                  {isPos ? '+' : isNeg ? '−' : '='}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2A3D5A] text-sm">{m.item_name_he}</p>
                  <p className="text-xs text-[#2A3D5A]/40 mt-0.5">
                    {m.previous_stock ?? '?'} → {m.new_stock ?? '?'}
                    {m.updated_by && ` • ${m.updated_by}`}
                    {m.source && ` • ${SOURCE_LABELS[m.source] || m.source}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-sm font-bold",
                    isPos ? "text-green-600" : isNeg ? "text-red-500" : "text-gray-400"
                  )}>
                    {isPos ? '+' : ''}{m.change_amount ?? 0}
                  </p>
                  {m.created_date && (
                    <p className="text-xs text-[#2A3D5A]/30 mt-0.5">
                      {format(new Date(m.created_date), 'dd/MM HH:mm')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}