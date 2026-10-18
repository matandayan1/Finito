import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MenuCard from '@/components/menu/MenuCard';
import MenuFilters from '@/components/menu/MenuFilters';
import { usePageTranslation } from '@/components/hooks/usePageTranslation';

export default function Menu() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('menuActiveTab') || 'Starters';
  });
  const [filters, setFilters] = useState({
    excludeAllergens: [],
    pregnancySafe: []
  });

  useEffect(() => {
    const savedScrollY = sessionStorage.getItem('menuScrollY');
    if (savedScrollY) {
      window.scrollTo(0, parseInt(savedScrollY));
      sessionStorage.removeItem('menuScrollY');
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('menuActiveTab', activeTab);
  }, [activeTab]);

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const MENU_FIELDS = ['name_he', 'short_story'];
  const { getTranslated } = usePageTranslation('menu', menuItems, MENU_FIELDS);

  const categories = ['Starters', 'Sushi', 'Skewers', 'Ippin', 'Izakaya', 'Ramen', 'Rice', 'Soup', 'Desserts'];

  const applyFilters = (items) => {
    return items.filter(item => {
      // Filter by allergens
      if (filters.excludeAllergens?.length > 0) {
        const hasExcludedAllergen = filters.excludeAllergens.some(allergen =>
          item.allergens?.includes(allergen)
        );
        if (hasExcludedAllergen) return false;
      }

      // Filter by pregnancy
      if (filters.pregnancySafe?.length > 0) {
        if (!filters.pregnancySafe.includes(item.pregnancy_note)) {
          return false;
        }
      }

      return true;
    });
  };

  const itemsByCategory = categories.reduce((acc, cat) => {
    const categoryItems = menuItems
      .filter(item => item.category === cat)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    acc[cat] = applyFilters(categoryItems);
    return acc;
  }, {});

  const clearFilters = () => {
    setFilters({
      excludeAllergens: [],
      pregnancySafe: []
    });
  };

  return (
    <div className={`min-h-screen bg-neutral-50 py-12 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-4xl font-light text-neutral-900 mb-10 text-center tracking-wide">
          {t('menu')}
        </h1>

        <MenuFilters 
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex flex-wrap justify-center gap-2 bg-transparent h-auto p-0 mb-10">
            {categories.map(cat => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="data-[state=active]:bg-neutral-900 data-[state=active]:text-white data-[state=inactive]:text-neutral-600 px-5 py-2.5 rounded-sm border border-neutral-200 data-[state=active]:border-neutral-900 transition-all"
              >
                {t(cat.toLowerCase())}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat} value={cat} className="mt-0">
              {isLoading ? (
                <div className="text-center py-12 text-neutral-500">{t('loading')}...</div>
              ) : itemsByCategory[cat]?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {itemsByCategory[cat].map(item => (
                    <MenuCard key={item.id} item={getTranslated(item)} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-neutral-500">
                  {t('noItemsInCategory')}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}