import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Globe, Menu as MenuIcon, UtensilsCrossed, BookText, X } from 'lucide-react';

function LayoutContent({ children }) {
  const { language, setLanguage, t, isRTL, languages } = useLanguage();
  const currentLanguage = languages.find(l => l.code === language);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-neutral-50 ${isRTL ? 'rtl' : ''}`}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-neutral-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2 group">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/693226ea1a79b292450150b9/226b16a44_WhatsAppImage2025-12-19at145135.jpeg" 
                alt="Kimura-Ya"
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain transition-transform group-hover:scale-105"
              />
              <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] font-light text-neutral-800 hidden xs:inline">KIMURA-YA</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link to={createPageUrl('Menu')}>
                <Button variant="ghost" size="sm" className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all">
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                  {t('menu')}
                </Button>
              </Link>
              <Link to={createPageUrl('Glossary')}>
                <Button variant="ghost" size="sm" className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all">
                  <BookText className="w-4 h-4 mr-2" />
                  {t('glossary')}
                </Button>
              </Link>
              <Link to={createPageUrl('Drinks')}>
                <Button variant="ghost" size="sm" className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all">
                  <span className="mr-2">🍸</span>
                  {t('drinks')}
                </Button>
              </Link>
              <Link to={createPageUrl('SakeAcademy')}>
                <Button variant="ghost" size="sm" className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all">
                  <span className="mr-2">🍶</span>
                  Sake Academy
                </Button>
              </Link>
              <Link to={createPageUrl('Games')}>
                <Button variant="ghost" size="sm" className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all">
                  <span className="mr-2">🎯</span>
                  {t('games')}
                </Button>
              </Link>
              <Link to={createPageUrl('Admin')}>
                <Button variant="ghost" size="sm" className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all">
                  <MenuIcon className="w-4 h-4 mr-2" />
                  {t('admin')}
                </Button>
              </Link>

              {/* Language Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-all">
                    <Globe className="w-4 h-4 mr-2" />
                    <span className="text-lg">{currentLanguage?.flag}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-neutral-200">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={language === lang.code ? 'bg-amber-50 text-amber-900' : ''}
                    >
                      <span className="text-lg mr-2">{lang.flag}</span>
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>

            {/* Mobile Navigation */}
            <div className="flex lg:hidden items-center gap-2">
              {/* Language Switcher for Mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-neutral-700">
                    <span className="text-xl">{currentLanguage?.flag}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-neutral-200">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={language === lang.code ? 'bg-amber-50 text-amber-900' : ''}
                    >
                      <span className="text-lg mr-2">{lang.flag}</span>
                      {lang.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-neutral-700">
                    <MenuIcon className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side={isRTL ? "left" : "right"} className="w-[300px] bg-white">
                  <div className="flex flex-col gap-4 mt-8">
                    <Link to={createPageUrl('Menu')} onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-base">
                        <UtensilsCrossed className="w-5 h-5 mr-3" />
                        {t('menu')}
                      </Button>
                    </Link>
                    <Link to={createPageUrl('Glossary')} onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-base">
                        <BookText className="w-5 h-5 mr-3" />
                        {t('glossary')}
                      </Button>
                    </Link>
                    <Link to={createPageUrl('Drinks')} onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-base">
                        <span className="mr-3 text-xl">🍸</span>
                        {t('drinks')}
                      </Button>
                    </Link>
                    <Link to={createPageUrl('SakeAcademy')} onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-base">
                        <span className="mr-3 text-xl">🍶</span>
                        Sake Academy
                      </Button>
                    </Link>
                    <Link to={createPageUrl('Games')} onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-base">
                        <span className="mr-3 text-xl">🎯</span>
                        {t('games')}
                      </Button>
                    </Link>
                    <Link to={createPageUrl('Admin')} onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-base">
                        <MenuIcon className="w-5 h-5 mr-3" />
                        {t('admin')}
                      </Button>
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-400 mt-20 py-8 border-t border-neutral-800">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm">
          <p className="mb-2">© 2026 Kimura-Ya - Staff Training Platform</p>
          <p className="text-xs text-neutral-500">Developed by Matan Dayan</p>
        </div>
      </footer>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <LanguageProvider>
      <LayoutContent>{children}</LayoutContent>
    </LanguageProvider>
  );
}