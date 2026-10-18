import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wine, Droplets, BookOpen } from 'lucide-react';
import DrinkCard from '@/components/drinks/DrinkCard';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { usePageTranslation } from '@/components/hooks/usePageTranslation';
export default function Drinks() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('cocktails');

  const { data: drinks = [], isLoading } = useQuery({
    queryKey: ['drinkItems'],
    queryFn: () => base44.entities.DrinkItem.list(),
  });

  const DRINK_FIELDS = ['name_he', 'description', 'garnish'];
  const { getTranslated: getDrinkTranslated } = usePageTranslation('drinks', drinks, DRINK_FIELDS);

  const cocktails = drinks.filter(d => d.category === 'Cocktails');
  const mocktails = drinks.filter(d => d.category === 'Mocktails');

  const PROFILES = ['Bitter', 'Sour', 'Sweet', 'Fresh', 'Complex', 'Spirit'];
  const profileColors = {
    'Bitter': 'bg-amber-600', 'Sour': 'bg-lime-600', 'Sweet': 'bg-pink-600',
    'Fresh': 'bg-cyan-600', 'Complex': 'bg-purple-600', 'Spirit': 'bg-neutral-600'
  };

  const cocktailsByProfile = PROFILES.reduce((acc, p) => {
    const items = cocktails.filter(c => c.flavor_profile === p);
    if (items.length) acc[p] = items;
    return acc;
  }, {});

  const mocktailsByProfile = PROFILES.reduce((acc, p) => {
    const items = mocktails.filter(m => m.flavor_profile === p);
    if (items.length) acc[p] = items;
    return acc;
  }, {});

  return (
    <div className={`min-h-screen bg-neutral-50 ${isRTL ? 'rtl' : ''}`}>
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Wine className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-light tracking-wide">{t('drinks')}</h1>
          </div>
          <p className="text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            {t('drinksHeroDesc')}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 bg-white hover:shadow-lg transition-all cursor-pointer border-neutral-200" onClick={() => setActiveTab('cocktails')}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Wine className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('cocktails')}</h3>
                <p className="text-sm text-gray-600">{cocktails.length} {t('items')}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white hover:shadow-lg transition-all cursor-pointer" onClick={() => setActiveTab('mocktails')}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{t('mocktails')}</h3>
                <p className="text-sm text-gray-600">{mocktails.length} {t('items')}</p>
              </div>
            </div>
          </Card>

          <Link to={createPageUrl('SpiritsReference')}>
            <Card className="p-6 bg-white hover:shadow-lg transition-all h-full">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{t('spiritsReference')}</h3>
                  <p className="text-sm text-gray-600">{t('admin')}</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="cocktails">{t('cocktails')}</TabsTrigger>
            <TabsTrigger value="mocktails">{t('mocktails')}</TabsTrigger>
          </TabsList>

          <TabsContent value="cocktails">
            {isLoading ? (
              <div className="text-center py-12">{t('loading')}...</div>
            ) : (
              <div className="space-y-12">
                {Object.entries(cocktailsByProfile).map(([profile, items]) => (
                  <div key={profile}>
                    <h2 className="text-2xl font-light mb-6 flex items-center gap-2">
                      <span className={`w-8 h-1 ${profileColors[profile]} rounded`}></span>
                      {t(profile.toLowerCase())}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map(drink => <DrinkCard key={drink.id} drink={getDrinkTranslated(drink)} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mocktails">
            {isLoading ? (
              <div className="text-center py-12">{t('loading')}...</div>
            ) : (
              <div className="space-y-12">
                {Object.entries(mocktailsByProfile).map(([profile, items]) => (
                  <div key={profile}>
                    <h2 className="text-2xl font-light mb-6 flex items-center gap-2">
                      <span className={`w-8 h-1 ${profileColors[profile]} rounded`}></span>
                      {t(profile.toLowerCase())}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map(drink => <DrinkCard key={drink.id} drink={getDrinkTranslated(drink)} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}