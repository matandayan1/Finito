import React from 'react';
import { useLanguage } from './LanguageContext';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from 'framer-motion';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export default function LanguageSelector({ minimal = false }) {
  const { language, setLanguage } = useLanguage();
  const currentLang = languages.find(l => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-10 px-3 gap-2 bg-white/60 backdrop-blur-sm hover:bg-white border-2 border-[#E8E0D8] shadow-sm rounded-2xl font-medium text-[#2A3D5A] transition-all duration-300"
        >
          <span className="text-lg">{currentLang?.flag}</span>
          {!minimal && <span className="hidden sm:inline text-sm">{currentLang?.name}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="min-w-[160px] rounded-2xl border-2 border-[#E8E0D8] shadow-xl bg-white/95 backdrop-blur-md p-1"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer gap-3 py-3 px-4 rounded-xl transition-all duration-200 ${
              language === lang.code 
                ? 'bg-[#2A3D5A] text-white' 
                : 'hover:bg-[#FFF8F0]'
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="font-medium">{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}