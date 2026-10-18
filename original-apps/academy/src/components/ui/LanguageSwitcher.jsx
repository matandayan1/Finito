import React, { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Globe, Plus } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage, languages, t } = useLanguage();
  const [showAddMessage, setShowAddMessage] = useState(false);

  const currentLanguage = languages.find(l => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 hover:bg-white/10 transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="text-lg">{currentLanguage?.flag}</span>
          <span className="hidden sm:inline">{currentLanguage?.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-md border-gray-200">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-3 cursor-pointer ${
              language === lang.code ? 'bg-red-50 text-red-700' : ''
            }`}
          >
            <span className="text-xl">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setShowAddMessage(true)}
          className="flex items-center gap-2 text-gray-500 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addLanguage')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}