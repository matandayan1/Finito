import React, { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import LazyImage from '@/components/ui/LazyImage';

const categoryColors = {
  Dry:      { border: 'border-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-900',   badge: 'bg-blue-100 text-blue-800' },
  Earthy:   { border: 'border-green-400',  bg: 'bg-green-50',  text: 'text-green-900',  badge: 'bg-green-100 text-green-800' },
  Umami:    { border: 'border-amber-400',  bg: 'bg-amber-50',  text: 'text-amber-900',  badge: 'bg-amber-100 text-amber-800' },
  Aromatic: { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-800' },
};

function SakeCard({ sake, t }) {
  const colors = categoryColors[sake.category] || categoryColors.Dry;
  return (
    <div className={`bg-white rounded-xl border-2 ${colors.border} overflow-hidden flex flex-col hover:shadow-md transition-shadow`}>
      <LazyImage
        src={sake.image_url}
        alt={sake.name_he}
        containerClassName="h-48"
        className="h-full w-full object-cover"
      />
      <div className="p-4 flex-1 space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{sake.name_he}</h3>
          <p className="text-sm text-slate-500">{sake.name_en}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sake.brewery && <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>{sake.brewery}</span>}
          {sake.alcohol && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{sake.alcohol}</span>}
          {sake.grade && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{sake.grade}</span>}
        </div>
        {sake.description && <p className="text-sm text-slate-700 leading-relaxed">{sake.description}</p>}
        {sake.food_pairing && (
          <div className={`${colors.bg} rounded-lg p-2.5`}>
            <p className={`text-xs font-semibold mb-0.5 ${colors.text}`}>{t('sakeFoodPairing')}</p>
            <p className="text-xs text-slate-700">{sake.food_pairing}</p>
          </div>
        )}
        {(sake.temperature || sake.profile) && (
          <div className="pt-2 border-t text-xs text-slate-600 grid grid-cols-2 gap-1">
            {sake.temperature && <span>🌡️ {sake.temperature}</span>}
            {sake.profile && <span>🍶 {sake.profile}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORIES = [
  { key: 'Dry',      he: 'חד ויבש',      en: 'Dry & Sharp' },
  { key: 'Earthy',   he: 'אדמתי ומלא',   en: 'Earthy & Full' },
  { key: 'Umami',    he: 'אומאמי ועשיר', en: 'Umami & Rich' },
  { key: 'Aromatic', he: 'ארומתי ופירותי', en: 'Aromatic' },
];

export default function SakeAcademy() {
  const { isRTL, language, t } = useLanguage();

  const { data: sakeItems = [], isLoading } = useQuery({
    queryKey: ['sakeItems'],
    queryFn: () => base44.entities.SakeItem.list(),
  });

  const byCategory = (cat) =>
    sakeItems.filter(s => s.category === cat).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const ingredients = [
    { icon: '🍚', titleKey: 'sakeRice', color: 'border-amber-400', pointsKey: 'sakeRicePoints' },
    { icon: '💧', titleKey: 'sakeWater', color: 'border-blue-400', pointsKey: 'sakeWaterPoints' },
    { icon: '🍄', titleKey: 'sakeKojiIngredient', color: 'border-purple-400', pointsKey: 'sakeKojiPoints' },
    { icon: '🧫', titleKey: 'sakeYeast', color: 'border-pink-400', pointsKey: 'sakeYeastPoints' },
  ];

  const pairings = [
    { icon: '🐟', foodKey: 'sakeRawFish', sakeKey: 'sakeRawFishSake', color: 'border-blue-400' },
    { icon: '🥩', foodKey: 'sakeMeat', sakeKey: 'sakeMeatSake', color: 'border-red-400' },
    { icon: '🍤', foodKey: 'sakeTempura', sakeKey: 'sakeTempuraSake', color: 'border-amber-400' },
    { icon: '🌶️', foodKey: 'sakeSpicy', sakeKey: 'sakeSpicySake', color: 'border-orange-400' },
  ];

  return (
    <div className={`min-h-screen bg-slate-50 ${isRTL ? 'rtl' : ''}`}>
      {/* Compact Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-10 px-6 text-center">
        <p className="text-sm tracking-widest mb-2 opacity-80">🎌 SAKE ACADEMY</p>
        <h1 className="text-3xl font-light mb-2">{t('sakeAcademy')}</h1>
        <p className="text-base opacity-90 max-w-xl mx-auto">{t('sakeAcademySubtitle')}</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Tabs defaultValue="intro">
          <TabsList className="flex flex-wrap gap-1 h-auto mb-6 bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
            <TabsTrigger value="intro" className="text-xs sm:text-sm">{t('sakeIntroTab')}</TabsTrigger>
            <TabsTrigger value="ingredients" className="text-xs sm:text-sm">{t('sakeIngredientsTab')}</TabsTrigger>
            <TabsTrigger value="process" className="text-xs sm:text-sm">{t('sakeProcessTab')}</TabsTrigger>
            <TabsTrigger value="flavors" className="text-xs sm:text-sm">{t('sakeFlavorsTab')}</TabsTrigger>
            <TabsTrigger value="pairing" className="text-xs sm:text-sm">{t('sakePairingTab')}</TabsTrigger>
            <TabsTrigger value="selling" className="text-xs sm:text-sm">{t('sakeSellingTab')}</TabsTrigger>
            <TabsTrigger value="collection" className="text-xs sm:text-sm">🍶 {t('sakeCollectionTab')}</TabsTrigger>
          </TabsList>

          {/* INTRO */}
          <TabsContent value="intro">
            <Card><CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">{t('sakeWhatIs')}</h2>
              <p className="text-slate-700 leading-relaxed">{t('sakeWhatIsP1')}</p>
              <p className="text-slate-700 leading-relaxed">{t('sakeWhatIsP2')}</p>
              <div className="grid sm:grid-cols-3 gap-4 mt-4">
                {[
                  { icon: '🍚', titleKey: 'sakeSpecialRice', descKey: 'sakeSpecialRiceDesc' },
                  { icon: '💧', titleKey: 'sakePureWater', descKey: 'sakePureWaterDesc' },
                  { icon: '🍄', titleKey: 'sakeKoji', descKey: 'sakeKojiDesc' },
                ].map(item => (
                  <div key={item.titleKey} className="bg-slate-50 rounded-lg p-4 text-center">
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <p className="font-semibold text-sm mb-1">{t(item.titleKey)}</p>
                    <p className="text-xs text-slate-600">{t(item.descKey)}</p>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* INGREDIENTS */}
          <TabsContent value="ingredients">
            <Card><CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('sakeIngredients')}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {ingredients.map(item => (
                  <div key={item.titleKey} className={`border-r-4 ${item.color} bg-white rounded-lg p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="font-semibold">{t(item.titleKey)}</span>
                    </div>
                    <ul className="space-y-1 text-sm text-slate-700">
                      {(t(item.pointsKey) || []).map((p, i) => <li key={i}>• {p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* PRODUCTION */}
          <TabsContent value="process">
            <Card><CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('sakeProduction')}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(t('sakeProductionSteps') || []).map((step, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">{i + 1}</span>
                    <span className="text-sm text-slate-700">{step}</span>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* FLAVORS */}
          <TabsContent value="flavors">
            <Card><CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">{t('sakeFlavorMap')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'sakeDrySharp', cls: 'bg-blue-50 border-blue-200 text-blue-900' },
                  { key: 'sakeUmamiRich', cls: 'bg-green-50 border-green-200 text-green-900' },
                  { key: 'sakeFruityAromatic', cls: 'bg-pink-50 border-pink-200 text-pink-900' },
                  { key: 'sakeCleanLight', cls: 'bg-cyan-50 border-cyan-200 text-cyan-900' },
                ].map(f => (
                  <div key={f.key} className={`border-2 rounded-lg p-3 text-center text-sm font-semibold ${f.cls}`}>{t(f.key)}</div>
                ))}
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="font-semibold text-sm mb-2">{t('sakeFlavorInfluenced')}</p>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• {t('sakePolishing')}</li>
                  <li>• {t('sakeWaterType')}</li>
                  <li>• {t('sakeYeastFlavor')}</li>
                  <li>• {t('sakeServingTemp')}</li>
                </ul>
              </div>
              <h3 className="font-semibold text-slate-900 pt-2">{t('sakeServingTempTitle')}</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: '❄️', titleKey: 'sakeCold', descKey: 'sakeColdDesc' },
                  { icon: '🌡️', titleKey: 'sakeRoomTemp', descKey: 'sakeRoomTempDesc' },
                  { icon: '🔥', titleKey: 'sakeWarm', descKey: 'sakeWarmDesc' },
                ].map(temp => (
                  <div key={temp.titleKey} className="flex gap-3 items-start bg-white border rounded-lg p-3">
                    <span className="text-2xl">{temp.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{t(temp.titleKey)}</p>
                      <p className="text-xs text-slate-600">{t(temp.descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                ⚠️ {t('sakeWarmingWarning')}
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* PAIRING */}
          <TabsContent value="pairing">
            <Card><CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('sakePairingTitle')}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {pairings.map(p => (
                  <div key={p.foodKey} className={`border-r-4 ${p.color} bg-white rounded-lg p-4 flex items-start gap-3`}>
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{t(p.foodKey)}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{t(p.sakeKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* SELLING */}
          <TabsContent value="selling">
            <Card><CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">{t('sakeSellingTitle')}</h2>
              <div className="space-y-3">
                {(t('sakeSellTips') || []).map((tip, i) => (
                  <div key={i} className="flex items-center gap-3 bg-indigo-50 rounded-lg p-3">
                    <span className="text-green-500 font-bold text-lg">✓</span>
                    <span className="text-slate-700 text-sm">{tip}</span>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* COLLECTION */}
          <TabsContent value="collection">
            <div className="space-y-8">
              <p className="text-center text-slate-600 text-sm">{t('sakeCollectionSubtitle')}</p>
              {isLoading ? (
                <div className="text-center py-12 text-slate-500">{t('sakeLoading')}</div>
              ) : sakeItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500">{t('sakeNoItems')}</div>
              ) : (
                CATEGORIES.map(cat => {
                  const items = byCategory(cat.key);
                  if (!items.length) return null;
                  return (
                    <div key={cat.key}>
                      <h2 className="text-xl font-semibold text-slate-800 mb-4 pb-2 border-b">
                        {language === 'he' ? cat.he : cat.en}
                      </h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {items.map(sake => <SakeCard key={sake.id} sake={sake} t={t} />)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}