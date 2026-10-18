import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAutoTranslate } from '@/components/hooks/useAutoTranslate';
import SpiritCard from '@/components/drinks/SpiritCard';

export default function SpiritsReference() {
  const { t, isRTL } = useLanguage();
  const { translatedText: pageDesc } = useAutoTranslate('מדריך למשקאות החריפים במסעדה');

  const { data: spirits = [], isLoading } = useQuery({
    queryKey: ['spiritItems'],
    queryFn: () => base44.entities.DrinkItem.filter({ category: 'Spirits' }),
  });

  const spiritsByType = spirits.reduce((acc, spirit) => {
    const type = spirit.spirit_type || 'Other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(spirit);
    return acc;
  }, {});

  const spiritOrder = ['Vodka', 'Gin', 'Rum', 'Tequila', 'Mezcal', 'Whisky', 'Cognac', 'Vermouth', 'Liqueur', 'Shochu'];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-6xl mx-auto px-4">
        <Link to={createPageUrl('Drinks')}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('backToMenu')}
          </Button>
        </Link>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Wine className="w-12 h-12 text-amber-600" />
            <h1 className="text-4xl font-light text-gray-900">{t('spiritsReference')}</h1>
          </div>
          <p className="text-lg text-gray-600">{pageDesc}</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">{t('loading')}...</div>
        ) : (
          <div className="space-y-8">
            {spiritOrder.map(spiritType => {
              const items = spiritsByType[spiritType] || [];
              if (items.length === 0) return null;

              return (
                <Card key={spiritType}>
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Wine className="w-6 h-6 text-amber-600" />
                      {t(spiritType.toLowerCase())}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map(spirit => (
                        <SpiritCard key={spirit.id} spirit={spirit} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {spirits.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-gray-500">{t('noData')}</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}