import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function LanguageManagement() {
  const { t, isRTL } = useLanguage();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newLang, setNewLang] = useState({
    name: '',
    code: '',
    flag: '',
    isRTL: false
  });

  const builtInLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸', rtl: false, builtin: true },
    { code: 'he', name: 'עברית', flag: '🇮🇱', rtl: true, builtin: true },
    { code: 'ja', name: '日本語', flag: '🇯🇵', rtl: false, builtin: true },
    { code: 'fr', name: 'Français', flag: '🇫🇷', rtl: false, builtin: true },
    { code: 'ru', name: 'Русский', flag: '🇷🇺', rtl: false, builtin: true },
  ];

  const handleAddLanguage = () => {
    // TODO: Integrate with backend to add language and auto-translate
    console.log('Adding language:', newLang);
    setAddModalOpen(false);
    setNewLang({ name: '', code: '', flag: '', isRTL: false });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="bg-white rounded-2xl border-2 border-[#E8E0D8] shadow-sm overflow-hidden"
    >
      <div className="p-5 border-b border-[#E8E0D8]">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="h-5 w-5 text-[#7ABC98]" />
          <h3 className="font-semibold text-[#2A3D5A]">{t('languages')}</h3>
        </div>
        <p className="text-sm text-[#2A3D5A]/50">
          {isRTL ? 'נהל את השפות הזמינות במערכת' : 'Manage available languages in the system'}
        </p>
      </div>

      <div className="divide-y divide-[#E8E0D8]">
        {builtInLanguages.map((lang) => (
          <div key={lang.code} className="flex items-center justify-between p-4 hover:bg-[#FFF8F0] transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{lang.flag}</span>
              <div>
                <span className="font-medium text-[#2A3D5A] block">{lang.name}</span>
                <span className="text-xs text-[#2A3D5A]/40">{lang.code.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lang.rtl && (
                <span className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600">RTL</span>
              )}
              <span className="text-xs px-2 py-1 rounded-lg bg-[#7ABC98]/10 text-[#7ABC98] font-medium">
                {isRTL ? 'פעיל' : 'Active'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-[#FFF8F0]/50">
        <Button 
          onClick={() => setAddModalOpen(true)} 
          variant="outline" 
          className="w-full h-12 rounded-xl border-2 border-dashed border-[#7ABC98] text-[#7ABC98] hover:bg-[#7ABC98]/5 transition-all"
        >
          <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
          {isRTL ? 'הוסף שפה' : 'Add Language'}
        </Button>
      </div>

      {/* Add Language Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="rounded-2xl border-2 border-[#E8E0D8] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#2A3D5A]">
              {isRTL ? 'הוסף שפה חדשה' : 'Add New Language'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lang-name">{isRTL ? 'שם השפה' : 'Language Name'}</Label>
              <Input
                id="lang-name"
                value={newLang.name}
                onChange={(e) => setNewLang({ ...newLang, name: e.target.value })}
                placeholder={isRTL ? 'למשל: עברית' : 'e.g., Español'}
                className="rounded-xl border-2 border-[#E8E0D8]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-code">{isRTL ? 'קוד שפה (אופציונלי)' : 'Language Code (optional)'}</Label>
              <Input
                id="lang-code"
                value={newLang.code}
                onChange={(e) => setNewLang({ ...newLang, code: e.target.value })}
                placeholder="es"
                className="rounded-xl border-2 border-[#E8E0D8]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lang-flag">{isRTL ? 'דגל (אופציונלי)' : 'Flag Emoji (optional)'}</Label>
              <Input
                id="lang-flag"
                value={newLang.flag}
                onChange={(e) => setNewLang({ ...newLang, flag: e.target.value })}
                placeholder="🇪🇸"
                className="rounded-xl border-2 border-[#E8E0D8]"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label htmlFor="lang-rtl">{isRTL ? 'שפה מימין לשמאל (RTL)' : 'Right-to-Left (RTL)'}</Label>
              <Switch
                id="lang-rtl"
                checked={newLang.isRTL}
                onCheckedChange={(checked) => setNewLang({ ...newLang, isRTL: checked })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                className="flex-1 rounded-xl border-2 border-[#E8E0D8]"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={handleAddLanguage}
                disabled={!newLang.name}
                className="flex-1 rounded-xl bg-[#7ABC98] hover:bg-[#6aac88]"
              >
                {isRTL ? 'הוסף' : 'Add'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}