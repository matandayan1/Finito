import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Trash2, Package, AlertTriangle, CheckCircle2, Loader2, Bell, Pencil, ShoppingCart, FileDown, Camera, LayoutGrid, List, ClipboardList, MessageCircle, GripVertical, Settings2, X, TrendingUp, Scan } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import PurchaseOrders from './PurchaseOrders';
import QuickCountMode from './QuickCountMode';
import InventoryMovementLog from './InventoryMovementLog';
import ImageLightbox from '@/components/ui/ImageLightbox';

const WORK_AREAS = ['floor', 'bar', 'host', 'kitchen', 'cleaning'];
const AREA_LABELS = { floor: 'פלור', bar: 'בר', host: 'אירוח', kitchen: 'מטבח', cleaning: "מנהלים" };
const AREA_COLORS = {
  floor: 'bg-blue-50 text-blue-700 border-blue-200',
  bar: 'bg-purple-50 text-purple-700 border-purple-200',
  host: 'bg-amber-50 text-amber-700 border-amber-200',
  kitchen: 'bg-orange-50 text-orange-700 border-orange-200',
  cleaning: 'bg-teal-50 text-teal-700 border-teal-200',
};

const DEFAULT_BAR_CATEGORIES = [
  { id: 'soft_drinks_beer', label: 'שתיה קלה ובירות', emoji: '🍺', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { id: 'sake_wine',        label: 'סאקה ויינות',      emoji: '🍷', color: 'bg-rose-50 border-rose-200 text-rose-700' },
  { id: 'alcohol_speed',   label: 'אלכוהול ספיד',     emoji: '🥃', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { id: 'alcohol_display', label: 'אלכוהול דיספליי',  emoji: '✨', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { id: 'coffee_tea',      label: 'קפה ותה',           emoji: '☕', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'juices_syrups',   label: 'מיצים וסירופים',   emoji: '🧃', color: 'bg-green-50 border-green-200 text-green-700' },
];

const DEFAULT_KITCHEN_CATEGORIES = [
  { id: 'matamei_israel',  label: 'Matamei Israel',  emoji: '🥘', color: 'bg-red-50 border-red-200 text-red-700' },
  { id: 'suzume',          label: 'Suzume',           emoji: '🍣', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { id: 'east_west',       label: 'East West',        emoji: '🌏', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { id: 'dip',             label: 'Dip',              emoji: '🥣', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { id: 'makati_kabalan',  label: 'Makati Kabalan',   emoji: '🍱', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'yosemite',        label: 'Yosemite',         emoji: '🌲', color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'madag',           label: 'Madag',             emoji: '🌿', color: 'bg-teal-50 border-teal-200 text-teal-700' },
];

const CATEGORY_COLORS = [
  'bg-yellow-50 border-yellow-200 text-yellow-700',
  'bg-rose-50 border-rose-200 text-rose-700',
  'bg-orange-50 border-orange-200 text-orange-700',
  'bg-indigo-50 border-indigo-200 text-indigo-700',
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-green-50 border-green-200 text-green-700',
  'bg-cyan-50 border-cyan-200 text-cyan-700',
  'bg-purple-50 border-purple-200 text-purple-700',
  'bg-pink-50 border-pink-200 text-pink-700',
  'bg-teal-50 border-teal-200 text-teal-700',
];

function loadBarCategories() {
  try {
    const saved = localStorage.getItem('bar_categories');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_BAR_CATEGORIES;
}

function saveBarCategories(cats) {
  localStorage.setItem('bar_categories', JSON.stringify(cats));
}

function loadKitchenCategories() {
  try {
    const saved = localStorage.getItem('kitchen_categories');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_KITCHEN_CATEGORIES;
}

function saveKitchenCategories(cats) {
  localStorage.setItem('kitchen_categories', JSON.stringify(cats));
}

const EMPTY_FORM = {
  name_he: '', name_en: '', unit: '', image_url: '',
  min_stock: '', max_stock: '', current_stock: '',
  box_enabled: false, box_label: 'ארגז', units_per_box: '',
  bar_category: '',
  kitchen_category: '',
  barcode: '',
};

function calcOrder(item) {
  const current = Number(item.current_stock) || 0;
  const max = Number(item.max_stock) || 0;
  const min = Number(item.min_stock) || 0;
  if (current >= min || max === 0) return null;
  const needed = max - current;
  if (item.box_enabled && item.units_per_box) {
    const upb = Number(item.units_per_box);
    const boxes = Math.max(1, Math.round(needed / upb));
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

const STATUS_STYLES = {
  critical: { bar: 'bg-red-400', text: 'text-red-600', label: 'מתחת למינימום!' },
  low: { bar: 'bg-amber-400', text: 'text-amber-600', label: 'מלאי נמוך' },
  ok: { bar: 'bg-[#7ABC98]', text: 'text-[#7ABC98]', label: 'תקין' },
  full: { bar: 'bg-[#7ABC98]', text: 'text-[#7ABC98]', label: 'מלא' },
  unknown: { bar: 'bg-gray-200', text: 'text-gray-400', label: '' },
};

export default function InventoryManager() {
  const queryClient = useQueryClient();
  const [activeArea, setActiveArea] = useState('floor');
  const [activeBarCategory, setActiveBarCategory] = useState(null);
  const [activeKitchenCategory, setActiveKitchenCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('items');
  const [viewMode, setViewMode] = useState('list');
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formArea, setFormArea] = useState('floor');
  const [barCategories, setBarCategories] = useState(loadBarCategories);
  const [catEditorOpen, setCatEditorOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📦');
  const [kitchenCategories, setKitchenCategories] = useState(loadKitchenCategories);
  const [kitchenCatEditorOpen, setKitchenCatEditorOpen] = useState(false);
  const [newKitchenCatLabel, setNewKitchenCatLabel] = useState('');
  const [newKitchenCatEmoji, setNewKitchenCatEmoji] = useState('📦');
  const [formBarcodeScanning, setFormBarcodeScanning] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const formScannerRef = React.useRef(null);

  const showCategoryGrid = (activeArea === 'bar' && !activeBarCategory) || (activeArea === 'kitchen' && !activeKitchenCategory);

  const itemsFilter = activeArea === 'bar' && activeBarCategory
    ? { work_area: 'bar', bar_category: activeBarCategory, is_active: true }
    : activeArea === 'kitchen' && activeKitchenCategory
    ? { work_area: 'kitchen', kitchen_category: activeKitchenCategory, is_active: true }
    : { work_area: activeArea, is_active: true };

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['inventory-items', activeArea, activeBarCategory, activeKitchenCategory],
    queryFn: async () => {
      const res = await base44.entities.InventoryItem.filter(itemsFilter, 'sort_order', 200);
      return res;
    },
    enabled: !showCategoryGrid,
  });

  const { data: allBarItems = [] } = useQuery({
    queryKey: ['inventory-items-bar-all'],
    queryFn: () => base44.entities.InventoryItem.filter({ work_area: 'bar', is_active: true }),
    enabled: activeArea === 'bar',
  });

  const { data: allKitchenItems = [] } = useQuery({
    queryKey: ['inventory-items-kitchen-all'],
    queryFn: () => base44.entities.InventoryItem.filter({ work_area: 'kitchen', is_active: true }),
    enabled: activeArea === 'kitchen',
  });

  const { data: allAlerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['inventory-alerts'],
    queryFn: () => base44.entities.InventoryAlert.list('-reported_at', 100),
    refetchInterval: 300000, // 5 minutes
    staleTime: 120000,
  });

  const openAlerts = allAlerts.filter(a => a.status === 'open');

  const openAdd = () => {
    setEditingItem(null);
    setFormArea(activeArea);
    setForm({
      ...EMPTY_FORM,
      bar_category: activeArea === 'bar' ? (activeBarCategory || '') : '',
      kitchen_category: activeArea === 'kitchen' ? (activeKitchenCategory || '') : '',
    });
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormArea(item.work_area || activeArea);
    setForm({
      name_he: item.name_he || '',
      name_en: item.name_en || '',
      unit: item.unit || '',
      image_url: item.image_url || '',
      min_stock: item.min_stock ?? '',
      max_stock: item.max_stock ?? '',
      current_stock: item.current_stock ?? '',
      box_enabled: item.box_enabled || false,
      box_label: item.box_label || 'ארגז',
      units_per_box: item.units_per_box ?? '',
      bar_category: item.bar_category || '',
      kitchen_category: item.kitchen_category || '',
      barcode: item.barcode || '',
    });
    setFormOpen(true);
  };

  const compressInventoryImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const useWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        const fmt = useWebP ? 'image/webp' : 'image/jpeg';
        const ext = useWebP ? '.webp' : '.jpg';
        canvas.toBlob(blob => resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ext), { type: fmt })), fmt, 0.75);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const compressed = await compressInventoryImage(file);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
    setForm(f => ({ ...f, image_url: file_url }));
    setUploadingImage(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      work_area: formArea,
      is_active: true,
      min_stock: form.min_stock !== '' ? Number(form.min_stock) : null,
      max_stock: form.max_stock !== '' ? Number(form.max_stock) : null,
      current_stock: form.current_stock !== '' ? Number(form.current_stock) : null,
      units_per_box: form.units_per_box !== '' ? Number(form.units_per_box) : null,
    };
    if (editingItem) {
      await base44.entities.InventoryItem.update(editingItem.id, data);
    } else {
      await base44.entities.InventoryItem.create(data);
    }
    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-items-bar-all'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-items-kitchen-all'] });
    setFormOpen(false);
    setSaving(false);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const reordered = [...items];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    queryClient.setQueryData(['inventory-items', activeArea, activeBarCategory, activeKitchenCategory], reordered);
    await Promise.all(reordered.map((item, i) => base44.entities.InventoryItem.update(item.id, { sort_order: i })));
  };

  const handleDelete = async (item) => {
    await base44.entities.InventoryItem.update(item.id, { is_active: false });
    queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-items-bar-all'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-items-kitchen-all'] });
  };

  const handleAddCategory = () => {
    if (!newCatLabel.trim()) return;
    const id = 'custom_' + Date.now();
    const colorIndex = barCategories.length % CATEGORY_COLORS.length;
    const newCat = { id, label: newCatLabel.trim(), emoji: newCatEmoji, color: CATEGORY_COLORS[colorIndex] };
    const updated = [...barCategories, newCat];
    setBarCategories(updated);
    saveBarCategories(updated);
    setNewCatLabel('');
    setNewCatEmoji('📦');
  };

  const handleDeleteCategory = (catId) => {
    const updated = barCategories.filter(c => c.id !== catId);
    setBarCategories(updated);
    saveBarCategories(updated);
    if (activeBarCategory === catId) setActiveBarCategory(null);
  };

  const handleAddKitchenCategory = () => {
    if (!newKitchenCatLabel.trim()) return;
    const id = 'custom_' + Date.now();
    const colorIndex = kitchenCategories.length % CATEGORY_COLORS.length;
    const newCat = { id, label: newKitchenCatLabel.trim(), emoji: newKitchenCatEmoji, color: CATEGORY_COLORS[colorIndex] };
    const updated = [...kitchenCategories, newCat];
    setKitchenCategories(updated);
    saveKitchenCategories(updated);
    setNewKitchenCatLabel('');
    setNewKitchenCatEmoji('📦');
  };

  const handleDeleteKitchenCategory = (catId) => {
    const updated = kitchenCategories.filter(c => c.id !== catId);
    setKitchenCategories(updated);
    saveKitchenCategories(updated);
    if (activeKitchenCategory === catId) setActiveKitchenCategory(null);
  };

  const handleResolveAlert = async (alert) => {
    await base44.entities.InventoryAlert.update(alert.id, { status: 'resolved' });
    queryClient.invalidateQueries({ queryKey: ['inventory-alerts'] });
  };

  const itemsNeedingOrder = items.filter(item => {
    const status = getStockStatus(item);
    return status === 'critical' || status === 'low';
  });

  return (
    <div className="space-y-4">
      {/* Tab Switch */}
      <div className="flex flex-wrap gap-2 p-1 bg-white rounded-2xl border-2 border-[#E8E0D8] w-fit">
        {[
          { id: 'items', icon: Package, label: 'פריטי מלאי' },
          { id: 'order', icon: ShoppingCart, label: 'הזמנה נדרשת', badge: itemsNeedingOrder.length },
          { id: 'purchases', icon: ClipboardList, label: 'הזמנות רכש' },
          { id: 'alerts', icon: Bell, label: 'התראות חסר', badge: openAlerts.length },
          { id: 'movements', icon: TrendingUp, label: 'תנועות מלאי' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative",
              activeTab === tab.id ? "bg-[#2A3D5A] text-white shadow-md" : "text-[#2A3D5A]/50 hover:text-[#2A3D5A]"
            )}>
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── ITEMS TAB ── */}
        {activeTab === 'items' && (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border-2 border-[#E8E0D8] shadow-sm">
              <div className="flex gap-2 flex-wrap items-center">
                {WORK_AREAS.map(area => (
                  <Button key={area} size="sm" variant={activeArea === area ? 'default' : 'outline'}
                    onClick={() => { setActiveArea(area); setActiveBarCategory(null); setActiveKitchenCategory(null); }}
                    className={cn("rounded-xl transition-all", activeArea === area ? "bg-[#2A3D5A]" : "border-2 border-[#E8E0D8] hover:border-[#7ABC98]")}>
                    {AREA_LABELS[area]}
                  </Button>
                ))}

                {/* Bar breadcrumb */}
                {activeArea === 'bar' && activeBarCategory && (
                  <>
                    <span className="text-[#2A3D5A]/30 text-sm">›</span>
                    <button onClick={() => setActiveBarCategory(null)}
                      className="text-sm text-purple-600 font-medium hover:underline">
                      {barCategories.find(c => c.id === activeBarCategory)?.emoji} {barCategories.find(c => c.id === activeBarCategory)?.label}
                    </button>
                  </>
                )}
                {activeArea === 'bar' && !activeBarCategory && (
                  <button onClick={() => setCatEditorOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-[#2A3D5A]/40 hover:text-[#2A3D5A] border border-[#E8E0D8] rounded-xl px-3 py-1.5 hover:border-[#7ABC98] transition-all">
                    <Settings2 className="h-3.5 w-3.5" /> עריכת קטגוריות
                  </button>
                )}

                {/* Kitchen breadcrumb */}
                {activeArea === 'kitchen' && activeKitchenCategory && (
                  <>
                    <span className="text-[#2A3D5A]/30 text-sm">›</span>
                    <button onClick={() => setActiveKitchenCategory(null)}
                      className="text-sm text-orange-600 font-medium hover:underline">
                      {kitchenCategories.find(c => c.id === activeKitchenCategory)?.emoji} {kitchenCategories.find(c => c.id === activeKitchenCategory)?.label}
                    </button>
                  </>
                )}
                {activeArea === 'kitchen' && !activeKitchenCategory && (
                  <button onClick={() => setKitchenCatEditorOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-[#2A3D5A]/40 hover:text-[#2A3D5A] border border-[#E8E0D8] rounded-xl px-3 py-1.5 hover:border-[#7ABC98] transition-all">
                    <Settings2 className="h-3.5 w-3.5" /> עריכת ספקים
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!showCategoryGrid && (
                  <div className="flex p-0.5 bg-[#F5F0EA] rounded-xl border border-[#E8E0D8]">
                    <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'grid' ? "bg-white shadow-sm" : "text-[#2A3D5A]/40")} title="תצוגת רשת">
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white shadow-sm" : "text-[#2A3D5A]/40")} title="תצוגת רשימה (גרירה לסידור)">
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {viewMode === 'list' && !showCategoryGrid && (
                  <span className="text-xs text-[#2A3D5A]/35 flex items-center gap-1">
                    <GripVertical className="h-3 w-3" /> גרור לסידור
                  </span>
                )}
                {!showCategoryGrid && (
                  <Button onClick={openAdd} className="rounded-xl bg-[#7ABC98] hover:bg-[#6aac88] shadow-md">
                    <Plus className="h-4 w-4 mr-1" /> הוסף פריט
                  </Button>
                )}
              </div>
            </div>

            {/* Bar category grid */}
            {activeArea === 'bar' && !activeBarCategory ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {barCategories.map((cat, i) => {
                  const count = allBarItems.filter(item => item.bar_category === cat.id).length;
                  const criticalCount = allBarItems.filter(item => item.bar_category === cat.id && (getStockStatus(item) === 'critical' || getStockStatus(item) === 'low')).length;
                  return (
                    <motion.button key={cat.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      onClick={() => setActiveBarCategory(cat.id)}
                      className={cn("relative p-5 rounded-2xl border-2 text-right transition-all hover:shadow-md flex flex-col gap-2 bg-white", cat.color)}>
                      <span className="text-3xl">{cat.emoji}</span>
                      <p className="font-semibold text-sm leading-tight">{cat.label}</p>
                      <p className="text-xs opacity-60">{count} פריטים</p>
                      {criticalCount > 0 && (
                        <span className="absolute top-2 left-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                          {criticalCount}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

            /* Kitchen category grid */
            ) : activeArea === 'kitchen' && !activeKitchenCategory ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {kitchenCategories.map((cat, i) => {
                  const count = allKitchenItems.filter(item => item.kitchen_category === cat.id).length;
                  const criticalCount = allKitchenItems.filter(item => item.kitchen_category === cat.id && (getStockStatus(item) === 'critical' || getStockStatus(item) === 'low')).length;
                  const unassigned = i === kitchenCategories.length - 1
                    ? allKitchenItems.filter(item => !item.kitchen_category).length
                    : 0;
                  return (
                    <motion.button key={cat.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      onClick={() => setActiveKitchenCategory(cat.id)}
                      className={cn("relative p-5 rounded-2xl border-2 text-right transition-all hover:shadow-md flex flex-col gap-2 bg-white", cat.color)}>
                      <span className="text-3xl">{cat.emoji}</span>
                      <p className="font-semibold text-sm leading-tight">{cat.label}</p>
                      <p className="text-xs opacity-60">{count} פריטים</p>
                      {criticalCount > 0 && (
                        <span className="absolute top-2 left-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                          {criticalCount}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
                {/* Unassigned category */}
                {allKitchenItems.filter(item => !item.kitchen_category).length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setActiveKitchenCategory('__unassigned__')}
                    className="relative p-5 rounded-2xl border-2 border-dashed border-[#E8E0D8] text-right transition-all hover:shadow-md flex flex-col gap-2 bg-white text-[#2A3D5A]/40">
                    <span className="text-3xl">📦</span>
                    <p className="font-semibold text-sm">ללא ספק</p>
                    <p className="text-xs opacity-60">{allKitchenItems.filter(item => !item.kitchen_category).length} פריטים</p>
                  </motion.button>
                )}
              </div>

            ) : loadingItems ? (
              <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#7ABC98]" /></div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-[#FFF8F0] border-2 border-[#E8E0D8] flex items-center justify-center">
                  <Package className="h-7 w-7 text-[#2A3D5A]/25" />
                </div>
                <p className="text-[#2A3D5A]/40 font-medium">אין פריטים במחלקה זו</p>
                <Button onClick={openAdd} className="mt-4 rounded-xl bg-[#7ABC98] hover:bg-[#6aac88]">
                  <Plus className="h-4 w-4 mr-1" /> הוסף פריט ראשון
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map((item) => {
                  const status = getStockStatus(item);
                  const styles = STATUS_STYLES[status];
                  const current = Number(item.current_stock) || 0;
                  const max = Number(item.max_stock) || 0;
                  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : null;
                  const order = calcOrder(item);
                  return (
                    <div key={item.id}
                      className={cn("relative bg-white rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-all",
                        status === 'critical' ? "border-red-200" : status === 'low' ? "border-amber-200" : "border-[#E8E0D8]"
                      )} onClick={() => openEdit(item)}>
                      <div className="h-32 bg-[#F5F0EA] flex items-center justify-center overflow-hidden">
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name_he} className="w-full h-full object-cover cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.image_url); }} />
                          : <Package className="h-10 w-10 text-[#2A3D5A]/20" />
                        }
                      </div>
                      {styles.label && (
                        <div className={cn("absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-white/90 shadow-sm", styles.text)}>
                          {styles.label}
                        </div>
                      )}
                      {status === 'critical' && (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const text = encodeURIComponent(`⚠️ התראת מלאי קריטי!\nפריט: ${item.name_he}\nמלאי נוכחי: ${item.current_stock} ${item.unit}\nמינימום: ${item.min_stock} ${item.unit}\nנדרשת הזמנה דחופה!`);
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                        }} className="absolute top-2 left-2 h-7 w-7 bg-green-500 rounded-full flex items-center justify-center shadow-md hover:bg-green-600 transition-colors" title="שלח התראה ב-WhatsApp">
                          <MessageCircle className="h-3.5 w-3.5 text-white" />
                        </button>
                      )}
                      <div className="p-3 flex-1 flex flex-col gap-1">
                        <p className="font-semibold text-[#2A3D5A] text-sm leading-tight">{item.name_he}</p>
                        {item.name_en && <p className="text-xs text-[#2A3D5A]/40 truncate">{item.name_en}</p>}
                        {pct !== null && (
                          <div className="mt-1">
                            <div className="flex justify-between text-xs text-[#2A3D5A]/40 mb-1">
                              <span>{item.current_stock}</span>
                              <span>{item.max_stock} {item.unit}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#E8E0D8] overflow-hidden">
                              <div className={cn("h-full rounded-full", styles.bar)} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                        {order && (
                          <p className="text-xs font-semibold text-amber-600 mt-1">
                            להזמין: {order.needed} {item.unit}
                            {order.boxes !== null && ` (${order.boxes} ${item.box_label || 'ארגז'})`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="inventory-list" mode="standard" type="DEFAULT">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                      {items.map((item, i) => {
                        const status = getStockStatus(item);
                        const styles = STATUS_STYLES[status];
                        const current = Number(item.current_stock) || 0;
                        const max = Number(item.max_stock) || 0;
                        const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : null;
                        const order = calcOrder(item);
                        return (
                          <Draggable key={item.id} draggableId={String(item.id)} index={i}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={provided.draggableProps.style}
                                className={cn(
                                  "p-4 bg-white rounded-2xl border-2 shadow-sm",
                                  snapshot.isDragging
                                    ? "shadow-2xl border-[#7ABC98] opacity-95"
                                    : status === 'critical' ? "border-red-200"
                                    : status === 'low' ? "border-amber-200"
                                    : "border-[#E8E0D8]"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="flex items-center justify-center w-8 h-8 rounded-lg text-[#2A3D5A]/30 hover:text-[#7ABC98] hover:bg-[#F5F0EA] cursor-grab active:cursor-grabbing flex-shrink-0"
                                  >
                                    <GripVertical className="h-5 w-5" />
                                  </div>
                                  <div className="h-12 w-12 rounded-xl bg-[#F5F0EA] border border-[#E8E0D8] flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {item.image_url
                                      ? <img src={item.image_url} alt={item.name_he} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setLightboxUrl(item.image_url)} />
                                      : <Package className="h-5 w-5 text-[#2A3D5A]/30" />
                                    }
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-semibold text-[#2A3D5A]">{item.name_he}</p>
                                      {styles.label && <span className={cn("text-xs font-medium flex-shrink-0", styles.text)}>{styles.label}</span>}
                                    </div>
                                    {pct !== null && (
                                      <div className="mt-1.5 space-y-1">
                                        <div className="flex justify-between text-xs text-[#2A3D5A]/40">
                                          <span>מינימום: {item.min_stock} {item.unit}</span>
                                          <span>{item.current_stock} / {item.max_stock}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-[#E8E0D8] overflow-hidden">
                                          <div className={cn("h-full rounded-full", styles.bar)} style={{ width: `${pct}%` }} />
                                        </div>
                                      </div>
                                    )}
                                    {order && (
                                      <p className="mt-1 text-xs font-semibold text-amber-600">
                                        להזמין: {order.needed} {item.unit}
                                        {order.boxes !== null && ` (${order.boxes} ${item.box_label || 'ארגז'})`}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    {status === 'critical' && (
                                      <button onClick={() => {
                                        const text = encodeURIComponent(`⚠️ התראת מלאי קריטי!\nפריט: ${item.name_he}\nמלאי נוכחי: ${item.current_stock} ${item.unit}\nמינימום: ${item.min_stock} ${item.unit}\nנדרשת הזמנה דחופה!`);
                                        window.open(`https://wa.me/?text=${text}`, '_blank');
                                      }} className="h-8 w-8 rounded-xl flex items-center justify-center text-green-500 hover:bg-green-50" title="שלח התראה בוואטסאפ">
                                        <MessageCircle className="h-4 w-4" />
                                      </button>
                                    )}
                                    <button onClick={() => openEdit(item)}
                                      className="h-8 w-8 rounded-xl flex items-center justify-center text-[#2A3D5A]/30 hover:text-[#2A3D5A] hover:bg-[#FFF8F0]">
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(item)}
                                      className="h-8 w-8 rounded-xl flex items-center justify-center text-[#2A3D5A]/30 hover:text-red-500 hover:bg-red-50">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </motion.div>
        )}

        {/* ── ORDER TAB ── */}
        {activeTab === 'order' && (
          <motion.div key="order" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <OrderSummary />
          </motion.div>
        )}

        {/* ── PURCHASES TAB ── */}
        {activeTab === 'purchases' && (
          <motion.div key="purchases" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PurchaseOrders />
          </motion.div>
        )}

        {activeTab === 'items' && (
          <div className="flex justify-end">
            <QuickCountMode />
          </div>
        )}

        {/* ── ALERTS TAB ── */}
        {activeTab === 'alerts' && (
          <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {loadingAlerts ? (
              <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#7ABC98]" /></div>
            ) : openAlerts.length === 0 ? (
              <div className="text-center py-16">
                <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-green-50 border-2 border-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-green-500" />
                </div>
                <p className="text-[#2A3D5A]/40 font-medium">אין התראות פתוחות</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openAlerts.map((alert, i) => (
                  <motion.div key={alert.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-3 p-4 bg-white rounded-2xl border-2 border-red-100 shadow-sm">
                    <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-[#2A3D5A]">{alert.item_name_he}</p>
                        <span className={cn("text-xs px-2 py-0.5 rounded-lg border font-medium", AREA_COLORS[alert.work_area])}>
                          {AREA_LABELS[alert.work_area]}
                        </span>
                      </div>
                      {alert.note && <p className="text-sm text-[#2A3D5A]/60 mt-1">{alert.note}</p>}
                      <p className="text-xs text-[#2A3D5A]/35 mt-1">
                        {alert.reported_by && `${alert.reported_by} • `}
                        {alert.reported_at ? format(new Date(alert.reported_at), 'dd/MM HH:mm') : ''}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => handleResolveAlert(alert)}
                      className="rounded-xl bg-[#7ABC98] hover:bg-[#6aac88] text-white flex-shrink-0 text-xs">
                      טופל
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── MOVEMENTS TAB ── */}
        {activeTab === 'movements' && (
          <motion.div key="movements" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InventoryMovementLog />
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Bar Category Editor Dialog ── */}
      <Dialog open={catEditorOpen} onOpenChange={setCatEditorOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-2 border-[#E8E0D8] max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#2A3D5A] text-right flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> עריכת קטגוריות בר
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              {barCategories.map(cat => (
                <div key={cat.id} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border-2", cat.color)}>
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="flex-1 font-medium text-sm">{cat.label}</span>
                  <button onClick={() => handleDeleteCategory(cat.id)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600 text-current/40 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-[#E8E0D8] pt-4 space-y-3">
              <p className="text-sm font-semibold text-[#2A3D5A]">הוסף קטגוריה חדשה</p>
              <div className="flex gap-2">
                <Input value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)}
                  className="w-16 rounded-xl border-2 border-[#E8E0D8] text-center text-lg" placeholder="😀" maxLength={2} />
                <Input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)}
                  placeholder="שם הקטגוריה..." dir="rtl"
                  className="flex-1 rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())} />
              </div>
              <Button onClick={handleAddCategory} disabled={!newCatLabel.trim()}
                className="w-full rounded-xl bg-[#7ABC98] hover:bg-[#6aac88]">
                <Plus className="h-4 w-4 mr-1" /> הוסף קטגוריה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Kitchen Category Editor Dialog ── */}
      <Dialog open={kitchenCatEditorOpen} onOpenChange={setKitchenCatEditorOpen}>
        <DialogContent className="max-w-sm rounded-3xl border-2 border-[#E8E0D8] max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#2A3D5A] text-right flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> עריכת ספקים / מחלקות מטבח
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              {kitchenCategories.map(cat => (
                <div key={cat.id} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border-2", cat.color)}>
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="flex-1 font-medium text-sm">{cat.label}</span>
                  <button onClick={() => handleDeleteKitchenCategory(cat.id)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600 text-current/40 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-[#E8E0D8] pt-4 space-y-3">
              <p className="text-sm font-semibold text-[#2A3D5A]">הוסף ספק / מחלקה חדשה</p>
              <div className="flex gap-2">
                <Input value={newKitchenCatEmoji} onChange={e => setNewKitchenCatEmoji(e.target.value)}
                  className="w-16 rounded-xl border-2 border-[#E8E0D8] text-center text-lg" placeholder="😀" maxLength={2} />
                <Input value={newKitchenCatLabel} onChange={e => setNewKitchenCatLabel(e.target.value)}
                  placeholder="שם הספק / המחלקה..." dir="ltr"
                  className="flex-1 rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddKitchenCategory())} />
              </div>
              <Button onClick={handleAddKitchenCategory} disabled={!newKitchenCatLabel.trim()}
                className="w-full rounded-xl bg-[#7ABC98] hover:bg-[#6aac88]">
                <Plus className="h-4 w-4 mr-1" /> הוסף
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode scanner overlay inside form */}
      {formBarcodeScanning && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#E8E0D8]">
              <button
                onClick={() => {
                  formScannerRef.current?.clear().catch(() => {});
                  setFormBarcodeScanning(false);
                }}
                className="text-sm text-[#2A3D5A]/50 hover:text-[#2A3D5A] px-3 py-1.5 rounded-xl border border-[#E8E0D8]"
              >
                סגור
              </button>
              <h2 className="font-semibold text-[#2A3D5A] flex items-center gap-2">
                <Scan className="h-5 w-5" /> סרוק ברקוד מוצר
              </h2>
            </div>
            <FormBarcodeScanner
              scannerRef={formScannerRef}
              onScanned={(code) => {
                setForm(f => ({ ...f, barcode: code }));
                setFormBarcodeScanning(false);
              }}
              onClose={() => setFormBarcodeScanning(false)}
            />
            <p className="text-xs text-center text-[#2A3D5A]/40 pb-4">כוון את המצלמה לברקוד של המוצר</p>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md rounded-3xl border-2 border-[#E8E0D8] max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[#2A3D5A] text-right">
              {editingItem ? 'עריכת פריט מלאי' : 'הוספת פריט מלאי'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5 pt-2">

            {/* Image upload */}
            <div className="space-y-2">
              <Label className="text-xs text-[#2A3D5A]/50">תמונת פריט</Label>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 rounded-2xl bg-[#F5F0EA] border-2 border-[#E8E0D8] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.image_url
                    ? <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    : <Camera className="h-7 w-7 text-[#2A3D5A]/25" />
                  }
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className={cn("flex items-center justify-center gap-2 h-9 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                    "border-[#E8E0D8] hover:border-[#7ABC98] hover:bg-[#7ABC98]/5")}>
                    {uploadingImage
                      ? <Loader2 className="h-4 w-4 animate-spin text-[#7ABC98]" />
                      : <><Camera className="h-4 w-4 text-[#2A3D5A]/30" /><span className="text-xs text-[#2A3D5A]/40">העלה מהגלריה</span></>
                    }
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                  <label className={cn("flex items-center justify-center gap-2 h-9 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                    "border-[#E8E0D8] hover:border-[#7ABC98] hover:bg-[#7ABC98]/5")}>
                    {uploadingImage
                      ? <Loader2 className="h-4 w-4 animate-spin text-[#7ABC98]" />
                      : <><Camera className="h-4 w-4 text-green-500" /><span className="text-xs text-[#2A3D5A]/40">צלם תמונה</span></>
                    }
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                  </label>
                </div>
                {form.image_url && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                    className="h-8 w-8 rounded-xl text-[#2A3D5A]/30 hover:text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Work Area selector */}
            <div className="space-y-2">
              <Label className="text-xs text-[#2A3D5A]/50">מחלקה</Label>
              <div className="flex flex-wrap gap-2">
                {WORK_AREAS.map(area => (
                  <button key={area} type="button"
                    onClick={() => {
                      setFormArea(area);
                      if (area !== 'bar') setForm(f => ({ ...f, bar_category: '' }));
                      if (area !== 'kitchen') setForm(f => ({ ...f, kitchen_category: '' }));
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all",
                      formArea === area
                        ? "bg-[#2A3D5A] text-white border-[#2A3D5A]"
                        : "border-[#E8E0D8] text-[#2A3D5A]/60 hover:border-[#7ABC98]"
                    )}>
                    {AREA_LABELS[area]}
                  </button>
                ))}
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">שם פריט (עברית) *</Label>
                <Input value={form.name_he} dir="rtl" required
                  onChange={e => setForm({ ...form, name_he: e.target.value })}
                  className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[#2A3D5A]/50">שם (אנגלית)</Label>
                <Input value={form.name_en} dir="ltr"
                  onChange={e => setForm({ ...form, name_en: e.target.value })}
                  className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[#2A3D5A]/50">יחידת מידה (חבילה, בקבוק, ק"ג...)</Label>
              <Input value={form.unit} dir="rtl" placeholder="למשל: חבילה"
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
            </div>

            {/* Barcode field */}
            <div className="space-y-1">
              <Label className="text-xs text-[#2A3D5A]/50">ברקוד מוצר</Label>
              <div className="flex gap-2">
                <Input value={form.barcode || ''} dir="ltr" placeholder="סרוק או הקלד ברקוד..."
                  onChange={e => setForm({ ...form, barcode: e.target.value })}
                  className="flex-1 rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98] font-mono text-sm" />
                <button type="button"
                  onClick={() => setFormBarcodeScanning(true)}
                  className="h-9 px-3 rounded-xl border-2 border-[#E8E0D8] hover:border-[#7ABC98] flex items-center gap-1.5 text-[#2A3D5A]/60 hover:text-[#2A3D5A] transition-all flex-shrink-0">
                  <Scan className="h-4 w-4" />
                  <span className="text-xs">סרוק</span>
                </button>
              </div>
              {form.barcode && <p className="text-xs text-[#7ABC98]">✓ ברקוד מוגדר — ניתן לסרוק מוצר זה בעתיד</p>}
            </div>

            {/* Bar category selector */}
            {formArea === 'bar' && (
              <div className="space-y-2">
                <Label className="text-xs text-[#2A3D5A]/50">קטגוריית בר</Label>
                <div className="grid grid-cols-2 gap-2">
                  {barCategories.map(cat => (
                    <button key={cat.id} type="button"
                      onClick={() => setForm(f => ({ ...f, bar_category: cat.id }))}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all text-right",
                        form.bar_category === cat.id
                          ? cat.color + " border-current"
                          : "border-[#E8E0D8] text-[#2A3D5A]/50 hover:border-[#7ABC98]"
                      )}>
                      <span>{cat.emoji}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Kitchen category selector */}
            {formArea === 'kitchen' && (
              <div className="space-y-2">
                <Label className="text-xs text-[#2A3D5A]/50">ספק / מחלקה</Label>
                <div className="grid grid-cols-2 gap-2">
                  {kitchenCategories.map(cat => (
                    <button key={cat.id} type="button"
                      onClick={() => setForm(f => ({ ...f, kitchen_category: cat.id }))}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all text-left",
                        form.kitchen_category === cat.id
                          ? cat.color + " border-current"
                          : "border-[#E8E0D8] text-[#2A3D5A]/50 hover:border-[#7ABC98]"
                      )}>
                      <span>{cat.emoji}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock levels */}
            <div className="p-4 rounded-2xl bg-[#FFF8F0]/60 border-2 border-[#E8E0D8] space-y-3">
              <p className="text-sm font-semibold text-[#2A3D5A]">רמות מלאי במחסן <span className="text-xs font-normal text-[#2A3D5A]/40">(ביחידות בודדות)</span></p>
              <div className="grid grid-cols-3 gap-3" dir="rtl">
                <div className="space-y-1">
                  <Label className="block text-xs text-[#2A3D5A]/50">נוכחי</Label>
                  <Input type="number" min="0" step="any" value={form.current_stock}
                    onChange={e => setForm({ ...form, current_stock: e.target.value })}
                    placeholder="0" dir="ltr"
                    className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98] text-center" />
                </div>
                <div className="space-y-1">
                  <Label className="block text-xs text-red-400">מינימום (סף הזמנה)</Label>
                  <Input type="number" min="0" step="any" value={form.min_stock}
                    onChange={e => setForm({ ...form, min_stock: e.target.value })}
                    placeholder="0" dir="ltr"
                    className="rounded-xl border-2 border-red-100 focus:border-red-300 text-center" />
                </div>
                <div className="space-y-1">
                  <Label className="block text-xs text-[#7ABC98]">מקסימום (מלא)</Label>
                  <Input type="number" min="0" step="any" value={form.max_stock}
                    onChange={e => setForm({ ...form, max_stock: e.target.value })}
                    placeholder="0" dir="ltr"
                    className="rounded-xl border-2 border-[#7ABC98]/30 focus:border-[#7ABC98] text-center" />
                </div>
              </div>
              {form.min_stock && form.max_stock && form.current_stock !== '' && (
                <p className="text-xs text-amber-600 font-medium">
                  {Number(form.current_stock) <= Number(form.min_stock)
                    ? `⚠️ להזמין: ${Number(form.max_stock) - Number(form.current_stock)} ${form.unit || 'יחידות'}`
                    : `✓ מלאי תקין`}
                </p>
              )}
            </div>

            {/* Box settings */}
            <div className="p-4 rounded-2xl bg-[#FFF8F0]/60 border-2 border-[#E8E0D8] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#2A3D5A]">הזמנה בארגזים / מארזים</p>
                <button type="button"
                  onClick={() => setForm({ ...form, box_enabled: !form.box_enabled })}
                  className={cn(
                    "relative h-6 w-11 rounded-full transition-colors flex-shrink-0",
                    form.box_enabled ? "bg-[#7ABC98]" : "bg-[#E8E0D8]"
                  )}>
                  <div className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200",
                    form.box_enabled ? "right-0.5 left-auto" : "left-0.5 right-auto"
                  )} />
                </button>
              </div>
              {form.box_enabled && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-[#2A3D5A]/50">שם האריזה (ארגז / מארז...)</Label>
                    <Input value={form.box_label} dir="rtl"
                      onChange={e => setForm({ ...form, box_label: e.target.value })}
                      placeholder="ארגז"
                      className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[#2A3D5A]/50">כמות יחידות בארגז</Label>
                    <Input type="number" min="1" step="any" value={form.units_per_box}
                      onChange={e => setForm({ ...form, units_per_box: e.target.value })}
                      placeholder="למשל: 12"
                      className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
                  </div>
                  {form.units_per_box && form.min_stock && form.max_stock && form.current_stock !== '' && Number(form.current_stock) <= Number(form.min_stock) && (
                    <div className="col-span-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                      {(() => {
                        const needed = Number(form.max_stock) - Number(form.current_stock);
                        const upb = Number(form.units_per_box);
                        const boxes = Math.max(1, Math.round(needed / upb));
                        return (
                          <span className="font-semibold">להזמין: {boxes} {form.box_label || 'ארגז'} <span className="font-normal text-amber-600/70">(חיסרון: {needed} {form.unit || 'יחידות'} — מעגל לארגז הקרוב)</span></span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving || !form.name_he} className="flex-1 rounded-2xl bg-[#2A3D5A] hover:bg-[#1e2d42]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="flex-1 rounded-2xl border-2 border-[#E8E0D8]">ביטול</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </div>
  );
}

// ── Mini barcode scanner for inside the form ──
function FormBarcodeScanner({ scannerRef, onScanned, onClose }) {
  const { useEffect } = React;
  useEffect(() => {
    let scanner = null;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const el = document.getElementById('form-barcode-div');
      if (!el) return;
      scanner = new Html5QrcodeScanner(
        'form-barcode-div',
        { fps: 10, qrbox: { width: 250, height: 150 }, supportedScanTypes: [0, 1] },
        false
      );
      scanner.render(
        (decodedText) => {
          if (cancelled) return;
          try { scanner.clear(); } catch {}
          onScanned(decodedText);
        },
        () => {}
      );
      scannerRef.current = scanner;
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (scannerRef.current) { scannerRef.current.clear().catch(() => {}); scannerRef.current = null; }
    };
  }, []);
  return <div id="form-barcode-div" className="w-full" />;
}

// ── Order Summary Component ──
function OrderSummary() {
  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['inventory-items-all'],
    queryFn: () => base44.entities.InventoryItem.filter({ is_active: true }),
  });

  const itemsToOrder = allItems.filter(item => {
    const status = getStockStatus(item);
    return status === 'critical' || status === 'low';
  });

  const exportToExcel = () => {
    const rows = itemsToOrder.map(item => {
      const order = calcOrder(item);
      const row = {
        'מחלקה': AREA_LABELS[item.work_area] || item.work_area,
        'שם פריט': item.name_he,
        'יחידת מידה': item.unit || '',
        'מלאי נוכחי': item.current_stock ?? '',
        'מינימום': item.min_stock ?? '',
        'מקסימום': item.max_stock ?? '',
        'כמות להזמנה': order ? order.needed : '',
      };
      if (item.box_enabled && item.units_per_box) {
        row[`${item.box_label || 'ארגז'}ים להזמין`] = order ? order.boxes : '';
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'הזמנה');
    XLSX.writeFile(wb, `הזמנת_מלאי_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.xlsx`);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-[#7ABC98]" /></div>;

  if (itemsToOrder.length === 0) return (
    <div className="text-center py-16">
      <div className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-green-50 border-2 border-green-100 flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-green-500" />
      </div>
      <p className="text-[#2A3D5A]/40 font-medium">אין פריטים שצריך להזמין כרגע</p>
    </div>
  );

  const byArea = {};
  itemsToOrder.forEach(item => {
    if (!byArea[item.work_area]) byArea[item.work_area] = [];
    byArea[item.work_area].push(item);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border-2 border-amber-200">
        <p className="text-sm font-semibold text-amber-700">📋 רשימת הזמנה נדרשת — {itemsToOrder.length} פריטים</p>
        <Button size="sm" onClick={exportToExcel}
          className="rounded-xl bg-[#2A3D5A] hover:bg-[#1e2d42] text-white flex items-center gap-2 text-xs">
          <FileDown className="h-4 w-4" />
          ייצא לאקסל
        </Button>
      </div>
      {Object.entries(byArea).map(([area, areaItems]) => (
        <div key={area} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold px-3 py-1 rounded-lg border", AREA_COLORS[area])}>
              {AREA_LABELS[area]}
            </span>
          </div>
          {areaItems.map((item, i) => {
            const order = calcOrder(item);
            return (
              <motion.div key={item.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-[#E8E0D8] shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#2A3D5A]">{item.name_he}</p>
                  <p className="text-xs text-[#2A3D5A]/40 mt-1 flex gap-2.5 flex-wrap" dir="rtl">
                    <span>נוכחי: <b className="text-[#2A3D5A]/70">{item.current_stock ?? '—'}</b></span>
                    <span>מינימום: <b className="text-red-400">{item.min_stock ?? '—'}</b></span>
                    <span>מקסימום: <b className="text-[#7ABC98]">{item.max_stock ?? '—'}</b></span>
                  </p>
                </div>
                {order && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] font-medium text-[#2A3D5A]/40 mb-0.5">להזמין</p>
                    <p className="text-lg font-bold text-amber-600 leading-tight">
                      {order.boxes !== null
                        ? `${order.boxes} ${item.box_label || 'ארגז'}`
                        : `${order.needed} ${item.unit || ''}`}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}