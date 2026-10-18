import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import GlossaryModal from '@/components/menu/GlossaryModal';
import { useSingleTranslation } from '@/components/hooks/usePageTranslation';

export default function MenuItem() {
  const { t, language, isRTL } = useLanguage();
  const params = new URLSearchParams(window.location.search);
  const itemId = params.get('id');

  const { data: item, isLoading } = useQuery({
    queryKey: ['menuItem', itemId],
    queryFn: async () => {
      const items = await base44.entities.MenuItem.list();
      return items.find(i => i.id === itemId);
    },
    enabled: !!itemId,
  });

  const { translated: translatedItem } = useSingleTranslation('menu', item, [
    'name_he', 'jp_term', 'short_story', 'not_modifiable_reason',
    'staff_notes', 'ingredients', 'modifiable_options'
  ]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">{t('loading')}...</div>;
  }

  if (!item) {
    return <div className="min-h-screen flex items-center justify-center">{t('itemNotFound')}</div>;
  }

  const imageSrc = item?.image_file || item?.image_url || `https://via.placeholder.com/800x400?text=${encodeURIComponent(item?.name_he || '')}`;
  const name = language === 'en' && item?.name_en ? item.name_en : (translatedItem?.name_he || item.name_he);

  const pregnancyColors = {
    'OK': 'bg-green-100 text-green-800',
    'Depends': 'bg-yellow-100 text-yellow-800',
    'Not recommended': 'bg-red-100 text-red-800'
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : ''}`}>
      {/* Hero Image */}
      <div className="w-full h-64 md:h-96 overflow-hidden bg-gray-200">
        <img 
          src={imageSrc} 
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = `https://via.placeholder.com/800x400?text=${encodeURIComponent(name)}`;
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link to={createPageUrl('Menu')}>
          <Button variant="ghost" className="mb-4">
            {isRTL ? <ArrowRight className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
            {t('menu')}
          </Button>
        </Link>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-light text-gray-900 mb-2">{name}</h1>
          {translatedItem?.jp_term && (
            <p className="text-lg text-gray-600 mt-1">{translatedItem.jp_term}</p>
          )}
        </div>

        {/* Story */}
        {translatedItem?.short_story && (
          <p className="text-gray-700 mb-6 text-lg">
            <GlossaryModal text={translatedItem.short_story} />
          </p>
        )}

        {/* Ingredients */}
        {translatedItem?.ingredients && translatedItem.ingredients.length > 0 && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-lg">{t('ingredients')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {translatedItem.ingredients.map((ing, idx) => (
                  <li key={idx} className="text-gray-700">
                    <GlossaryModal text={ing} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Modifications */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">{t('modifications')}</CardTitle>
          </CardHeader>
          <CardContent>
            {translatedItem?.modifiable_options && translatedItem.modifiable_options.length > 0 ? (
            <ul className="list-disc list-inside space-y-1">
              {translatedItem.modifiable_options.map((opt, idx) => (
                <li key={idx} className="text-gray-700">
                  <GlossaryModal text={opt} />
                </li>
              ))}
            </ul>
            ) : (
            <div>
              <p className="text-gray-700 font-medium">{t('notModifiable')}</p>
              {translatedItem?.not_modifiable_reason && (
                <p className="text-gray-600 text-sm mt-1">
                  <GlossaryModal text={translatedItem.not_modifiable_reason} />
                </p>
              )}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Allergens & Pregnancy */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="space-y-3">
              {item.allergens && item.allergens.length > 0 && (
                <div>
                  <p className="font-medium mb-2">{t('allergens')}:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.allergens.map(allergen => (
                      <Badge key={allergen} variant="secondary">
                        {t(allergen.toLowerCase())}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {item.pregnancy_note && (
                <div>
                  <p className="font-medium mb-2">{t('pregnancyNote')}:</p>
                  <Badge className={pregnancyColors[item.pregnancy_note]}>
                    {t(item.pregnancy_note.toLowerCase().replace(' ', ''))}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Staff Notes */}
        {translatedItem?.staff_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('staffNotes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                <GlossaryModal text={translatedItem.staff_notes} />
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}