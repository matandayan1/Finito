import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { useSingleTranslation } from '@/components/hooks/usePageTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wine, Droplets, AlertCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DrinkItem() {
  const { t, isRTL } = useLanguage();
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');

  const { data: drinks = [] } = useQuery({
    queryKey: ['drinkItems'],
    queryFn: () => base44.entities.DrinkItem.list(),
  });

  const drink = drinks.find(d => d.id === itemId);
  const { translated: translatedObj } = useSingleTranslation('drinks', drink, [
    'name_he', 'description', 'garnish', 'staff_notes', 'sensitivity_notes', 'ingredients'
  ]);

  if (!drink) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('loading')}...</p>
      </div>
    );
  }

  const imageSrc = drink.image_file || drink.image_url || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800';

  const alcoholColorMap = {
    'None': 'bg-gray-100 text-gray-700',
    'Low': 'bg-green-100 text-green-700',
    'Medium': 'bg-yellow-100 text-yellow-700',
    'High': 'bg-orange-100 text-orange-700',
    'Very High': 'bg-red-100 text-red-700'
  };

  const flavorColorMap = {
    'Bitter': 'bg-amber-100 text-amber-800',
    'Sour': 'bg-lime-100 text-lime-800',
    'Sweet': 'bg-pink-100 text-pink-800',
    'Fresh': 'bg-cyan-100 text-cyan-800',
    'Complex': 'bg-purple-100 text-purple-800'
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-4xl mx-auto px-4">
        <Link to={createPageUrl('Drinks')}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('backToMenu')}
          </Button>
        </Link>

        <Card className="overflow-hidden">
          {/* Hero Image */}
          <div className="relative h-96 overflow-hidden">
            <img 
              src={imageSrc}
              alt={translatedObj?.name_he || drink.name_he}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-4xl font-bold text-white mb-2">
                {translatedObj?.name_he || drink.name_he}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {drink.flavor_profile && (
                  <span className={`${flavorColorMap[drink.flavor_profile]} px-3 py-1 rounded-full text-sm font-medium`}>
                    {t(drink.flavor_profile.toLowerCase())}
                  </span>
                )}
                {drink.alcohol_content && drink.alcohol_content !== 'None' && (
                  <span className={`${alcoholColorMap[drink.alcohol_content]} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1`}>
                    <Wine className="w-4 h-4" />
                    {t(drink.alcohol_content.toLowerCase().replace(' ', ''))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Description */}
            {translatedObj?.description && (
              <div>
                <p className={`text-lg text-gray-700 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
                  {translatedObj.description}
                </p>
              </div>
            )}

            {/* Ingredients */}
            {translatedObj?.ingredients && translatedObj.ingredients.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-purple-600" />
                  {t('ingredients')}
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {translatedObj.ingredients.map((ingredient, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-gray-700">
                      <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Garnish */}
            {translatedObj?.garnish && (
              <div>
                <h3 className="text-lg font-semibold mb-3">{t('garnish')}</h3>
                <p className="text-gray-700">{translatedObj.garnish}</p>
              </div>
            )}

            {/* Allergens */}
            {drink.allergens && drink.allergens.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-orange-800">
                  <AlertCircle className="w-5 h-5" />
                  {t('allergens')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {drink.allergens.map((allergen, idx) => (
                    <span key={idx} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sensitivity Notes */}
            {translatedObj?.sensitivity_notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-yellow-800">
                  <Info className="w-5 h-5" />
                  {t('sensitivityNotes')}
                </h3>
                <p className="text-yellow-900">{translatedObj.sensitivity_notes}</p>
              </div>
            )}

            {/* Staff Notes */}
            {translatedObj?.staff_notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-blue-800">
                  <Info className="w-5 h-5" />
                  {t('staffNotes')}
                </h3>
                <p className="text-blue-900">{translatedObj.staff_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}