import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';
import { Badge } from "@/components/ui/badge";
import { Thermometer, AlertTriangle, Lightbulb, X, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function DishCard({ dish, index }) {
  const { language, t, isRTL } = useLanguage();
  const [showDetails, setShowDetails] = useState(false);

  const getName = () => {
    switch(language) {
      case 'he': return dish.nameHe;
      case 'fr': return dish.nameFr;
      case 'ja': return dish.nameJa;
      case 'ru': return dish.nameRu;
      default: return dish.nameEn;
    }
  };

  const getDescription = () => {
    switch(language) {
      case 'he': return dish.descriptionHe;
      case 'fr': return dish.descriptionFr;
      case 'ja': return dish.descriptionJa;
      case 'ru': return dish.descriptionRu;
      default: return dish.descriptionEn;
    }
  };

  const allergenColors = {
    fish: 'bg-blue-100 text-blue-800',
    shellfish: 'bg-purple-100 text-purple-800',
    gluten: 'bg-amber-100 text-amber-800',
    soy: 'bg-orange-100 text-orange-800',
    egg: 'bg-yellow-100 text-yellow-800',
    dairy: 'bg-cyan-100 text-cyan-800',
    sesame: 'bg-lime-100 text-lime-800'
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => setShowDetails(true)}
        className="group cursor-pointer"
      >
        <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-red-200">
          {/* Image */}
          <div className="relative aspect-video overflow-hidden">
            <img
              src={dish.image}
              alt={getName()}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              {dish.temperature === 'cold' && (
                <Badge className="bg-blue-500 text-white">
                  <Thermometer className="w-3 h-3 mr-1" />
                  {t('cold')}
                </Badge>
              )}
              {dish.temperature === 'hot' && (
                <Badge className="bg-red-500 text-white">
                  <Thermometer className="w-3 h-3 mr-1" />
                  {t('hot')}
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <div className={`p-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{getName()}</h3>
            {language !== 'en' && (
              <p className="text-sm text-gray-500 mb-2">{dish.nameEn}</p>
            )}
            <p className="text-sm text-gray-600 line-clamp-2">{getDescription()}</p>

            {/* Allergens */}
            {dish.allergens?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {dish.allergens.map(allergen => (
                  <Badge key={allergen} variant="outline" className={`text-xs ${allergenColors[allergen]}`}>
                    {t(allergen)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Detail Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : ''}`}>
          <DialogHeader>
            <DialogTitle className="text-2xl">{getName()}</DialogTitle>
            {language !== 'en' && (
              <p className="text-gray-500">{dish.nameEn}</p>
            )}
          </DialogHeader>

          <div className="space-y-6">
            {/* Image */}
            <img
              src={dish.image}
              alt={getName()}
              className="w-full h-64 object-cover rounded-lg"
            />

            {/* Description */}
            <p className="text-gray-700">{getDescription()}</p>

            {/* Key Ingredients */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-4 bg-red-500 rounded-full" />
                {t('keyIngredients')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {dish.ingredients?.map(ingredient => (
                  <Badge key={ingredient} variant="secondary" className="bg-gray-100">
                    {ingredient}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Temperature */}
            <div className="flex items-center gap-3">
              <Thermometer className={dish.temperature === 'hot' ? 'text-red-500' : 'text-blue-500'} />
              <span className="font-medium">
                {t('temperature')}: {t(dish.temperature)}
              </span>
            </div>

            {/* Allergens */}
            {dish.allergens?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  {t('allergens')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {dish.allergens.map(allergen => (
                    <Badge key={allergen} className={allergenColors[allergen]}>
                      {t(allergen)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Staff Tips */}
            {dish.staffTips?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  {t('serviceTips')}
                </h4>
                <ul className={`list-disc ${isRTL ? 'mr-4' : 'ml-4'} text-amber-700`}>
                  {dish.staffTips.map(tip => (
                    <li key={tip}>{t(tip)}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Japanese Terms */}
            {dish.japaneseTerms?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Japanese Terms
                </h4>
                <div className="flex flex-wrap gap-2">
                  {dish.japaneseTerms.map(term => (
                    <Badge key={term} className="bg-red-100 text-red-800">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}