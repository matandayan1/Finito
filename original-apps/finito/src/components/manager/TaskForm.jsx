import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, CalendarDays, Camera, X, Plus } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function TaskForm({ task, open, onClose, onSaved }) {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [formData, setFormData] = useState({
    name_en: '', name_he: '', name_ja: '', name_fr: '', name_ru: '',
    description_en: '', description_he: '', description_ja: '', description_fr: '', description_ru: '',
    work_area: 'floor', checklist_type: 'both', photo_requirement: 'none',
    recurring_schedule: 'always', days_of_week: [], sort_order: 0, is_active: true,
    example_images: []
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        name_en: task.name_en || '', name_he: task.name_he || '', name_ja: task.name_ja || '', name_fr: task.name_fr || '', name_ru: task.name_ru || '',
        description_en: task.description_en || '', description_he: task.description_he || '', description_ja: task.description_ja || '', description_fr: task.description_fr || '', description_ru: task.description_ru || '',
        work_area: task.work_area || 'floor', checklist_type: task.checklist_type || 'both', photo_requirement: task.photo_requirement || 'none',
        recurring_schedule: task.recurring_schedule || 'always', days_of_week: task.days_of_week || [], sort_order: task.sort_order || 0, is_active: task.is_active !== false,
        example_images: task.example_images || []
      });
    } else {
      setFormData({
        name_en: '', name_he: '', name_ja: '', name_fr: '', name_ru: '',
        description_en: '', description_he: '', description_ja: '', description_fr: '', description_ru: '',
        work_area: 'floor', checklist_type: 'both', photo_requirement: 'none',
        recurring_schedule: 'always', days_of_week: [], sort_order: 0, is_active: true,
        example_images: []
      });
    }
  }, [task, open]);

  const handleAddImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, example_images: [...(prev.example_images || []), file_url] }));
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({ ...prev, example_images: prev.example_images.filter((_, i) => i !== index) }));
  };

  const handleTranslate = async () => {
    const sourceName = formData.name_he || formData.name_en;
    if (!sourceName) return;
    setTranslating(true);

    const hebrewName = formData.name_he;
    const hebrewDesc = formData.description_he;

    const prompt = `You are a professional translator for a Japanese restaurant in Israel called Kimuraya.

The manager wrote the following task in Hebrew. Translate it accurately into English, Japanese, French, and Russian — keeping the exact meaning and wording from the Hebrew original. Do NOT rephrase or simplify.

Task name in Hebrew: "${hebrewName}"
${hebrewDesc ? `Task description in Hebrew:\n"${hebrewDesc}"` : ''}

Rules:
- Keep the Hebrew text exactly as written (do not change it).
- Translate into English, Japanese, French, and Russian based on the Hebrew.
- Preserve bullet points, line breaks, and formatting.
- Keep translations professional and concise.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          name_en: { type: 'string' }, name_ja: { type: 'string' }, name_fr: { type: 'string' }, name_ru: { type: 'string' },
          description_en: { type: 'string' }, description_ja: { type: 'string' }, description_fr: { type: 'string' }, description_ru: { type: 'string' }
        }
      }
    });

    // Keep Hebrew exactly as written, only update other languages
    setFormData(prev => ({
      ...prev,
      name_he: prev.name_he,
      description_he: prev.description_he,
      ...result
    }));
    setTranslating(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (task) {
      await base44.entities.ChecklistItem.update(task.id, formData);
      setLoading(false);
      onSaved(formData);
    } else {
      await base44.entities.ChecklistItem.create(formData);
      setLoading(false);
      onSaved(null);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-[#E8E0D8]", isRTL && "rtl")}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[#2A3D5A]">{task ? t('editTask') : t('createTask')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Names */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[#2A3D5A]/70">{t('taskName')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleTranslate} disabled={translating || (!formData.name_en && !formData.name_he)} className="gap-2 rounded-xl text-[#7ABC98] border-[#7ABC98] hover:bg-[#7ABC98]/10">
                {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {t('autoTranslate')}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { code: 'en', flag: '🇺🇸', placeholder: 'English' },
                { code: 'he', flag: '🇮🇱', placeholder: 'עברית', dir: 'rtl' },
                { code: 'fr', flag: '🇫🇷', placeholder: 'Français' },
                { code: 'ja', flag: '🇯🇵', placeholder: '日本語' },
                { code: 'ru', flag: '🇷🇺', placeholder: 'Русский' },
              ].map(lang => (
                <div key={lang.code} className="space-y-1">
                  <Label className="text-xs text-[#2A3D5A]/50 flex items-center gap-1.5">{lang.flag}</Label>
                  <Input
                    value={formData[`name_${lang.code}`]}
                    onChange={(e) => setFormData({ ...formData, [`name_${lang.code}`]: e.target.value })}
                    placeholder={lang.placeholder}
                    dir={lang.dir}
                    className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-[#2A3D5A]/70">{t('taskDescription')}</Label>
            <div className="grid grid-cols-2 gap-3">
              <Textarea value={formData.description_en} onChange={(e) => setFormData({ ...formData, description_en: e.target.value })} placeholder="🇺🇸 English" rows={2} className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
              <Textarea value={formData.description_he} onChange={(e) => setFormData({ ...formData, description_he: e.target.value })} placeholder="🇮🇱 עברית" dir="rtl" rows={2} className="rounded-xl border-2 border-[#E8E0D8] focus:border-[#7ABC98]" />
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-[#2A3D5A]/50">{t('workArea')}</Label>
              <Select value={formData.work_area} onValueChange={(v) => setFormData({ ...formData, work_area: v })}>
                <SelectTrigger className="rounded-xl border-2 border-[#E8E0D8]"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {['floor', 'bar', 'host', 'kitchen'].map(a => <SelectItem key={a} value={a}>{t(a)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#2A3D5A]/50">{t('checklistType')}</Label>
              <Select value={formData.checklist_type} onValueChange={(v) => setFormData({ ...formData, checklist_type: v })}>
                <SelectTrigger className="rounded-xl border-2 border-[#E8E0D8]"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="both">{t('all')}</SelectItem>
                  <SelectItem value="opening">{t('opening')}</SelectItem>
                  <SelectItem value="closing">{t('closing')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#2A3D5A]/50">{t('photoRequirement')}</Label>
              <Select value={formData.photo_requirement} onValueChange={(v) => setFormData({ ...formData, photo_requirement: v })}>
                <SelectTrigger className="rounded-xl border-2 border-[#E8E0D8]"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {['none', 'optional', 'required'].map(p => <SelectItem key={p} value={p}>{t(p)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Example Images */}
          <div className="space-y-3 p-4 rounded-2xl border-2 border-blue-100 bg-blue-50/40">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-500" />
              <Label className="text-sm font-semibold text-[#2A3D5A]">תמונות דוגמה למשימה</Label>
              <span className="text-xs text-[#2A3D5A]/40">(מראה לצוות איך זה צריך להיראות)</span>
            </div>

            {formData.example_images?.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {formData.example_images.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-[#E8E0D8]">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className={cn(
              "flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed cursor-pointer transition-all",
              "border-blue-200 hover:border-blue-400 hover:bg-blue-50"
            )}>
              {uploadingImage
                ? <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                : <><Plus className="h-4 w-4 text-blue-400" /><span className="text-sm text-blue-400">הוסף תמונת דוגמה</span></>
              }
              <input type="file" accept="image/*" className="hidden" onChange={handleAddImage} disabled={uploadingImage} />
            </label>
          </div>

          {/* Daily Task Schedule */}
          <div className="space-y-3 p-4 rounded-2xl border-2 border-[#E8E0D8] bg-[#FFF8F0]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#7ABC98]" />
                <Label className="text-sm font-semibold text-[#2A3D5A]">תדירות משימה</Label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, recurring_schedule: 'always', days_of_week: [] })}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all",
                  formData.recurring_schedule === 'always'
                    ? "bg-[#2A3D5A] text-white border-[#2A3D5A]"
                    : "bg-white text-[#2A3D5A]/60 border-[#E8E0D8] hover:border-[#2A3D5A]/30"
                )}
              >
                כל יום
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, recurring_schedule: 'specific_days' })}
                className={cn(
                  "flex-1 py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all",
                  formData.recurring_schedule === 'specific_days'
                    ? "bg-[#7ABC98] text-white border-[#7ABC98]"
                    : "bg-white text-[#2A3D5A]/60 border-[#E8E0D8] hover:border-[#7ABC98]/40"
                )}
              >
                ✦ משימה יומית (ימים ספציפיים)
              </button>
            </div>

            {formData.recurring_schedule === 'specific_days' && (
              <div className="space-y-2 pt-1">
                <Label className="text-xs text-[#2A3D5A]/50">בחר ימים:</Label>
                <div className="grid grid-cols-7 gap-1.5">
                  {[
                    { value: 'sunday', label: 'א׳' },
                    { value: 'monday', label: 'ב׳' },
                    { value: 'tuesday', label: 'ג׳' },
                    { value: 'wednesday', label: 'ד׳' },
                    { value: 'thursday', label: 'ה׳' },
                    { value: 'friday', label: 'ו׳' },
                    { value: 'saturday', label: 'ש׳' },
                  ].map(day => {
                    const selected = formData.days_of_week?.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => {
                          const newDays = selected
                            ? formData.days_of_week.filter(d => d !== day.value)
                            : [...(formData.days_of_week || []), day.value];
                          setFormData({ ...formData, days_of_week: newDays });
                        }}
                        className={cn(
                          "aspect-square rounded-xl text-sm font-bold border-2 transition-all",
                          selected
                            ? "bg-[#7ABC98] text-white border-[#7ABC98] shadow-md"
                            : "bg-white text-[#2A3D5A]/50 border-[#E8E0D8] hover:border-[#7ABC98]"
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
                {formData.days_of_week?.length === 0 && (
                  <p className="text-xs text-amber-500">בחר לפחות יום אחד</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl border-2 border-[#E8E0D8]">{t('cancel')}</Button>
            <Button type="submit" disabled={loading || !formData.name_en} className="flex-1 h-12 rounded-xl bg-[#2A3D5A] hover:bg-[#1e2d42]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}