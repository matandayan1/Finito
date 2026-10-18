import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';
import { menuData } from '@/components/data/menuData';
import DishCard from '@/components/menu/DishCard';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function MenuCategory() {
  const { language, isRTL } = useLanguage();
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get('category') || 'starters';

  const dishes = menuData[category] || [];

  const getCategoryName = () => {
    const names = {
      starters: { he: 'מנות ראשונות', en: 'Starters', fr: 'Entrées', ja: '前菜', ru: 'Закуски' },
      sushi: { he: 'סושי', en: 'Sushi', fr: 'Sushi', ja: '寿司', ru: 'Суши' },
      yakitori: { he: 'יאקיטורי', en: 'Yakitori', fr: 'Yakitori', ja: '焼き鳥', ru: 'Якитори' },
      ippin: { he: 'איפין - מנות חמות', en: 'Ippin - Hot Dishes', fr: 'Ippin', ja: '一品料理', ru: 'Иппин' },
      izakaya: { he: 'איזאקאיה', en: 'Izakaya', fr: 'Izakaya', ja: '居酒屋', ru: 'Изакая' },
      ramen: { he: 'ראמן', en: 'Ramen', fr: 'Ramen', ja: 'ラーメン', ru: 'Рамен' },
      rice: { he: 'אורז', en: 'Rice', fr: 'Riz', ja: 'ご飯', ru: 'Рис' },
      soup: { he: 'מרק', en: 'Soup', fr: 'Soupe', ja: 'スープ', ru: 'Суп' },
      sweets: { he: 'קינוחים', en: 'Sweets', fr: 'Desserts', ja: 'デザート', ru: 'Десерты' }
    };
    return names[category]?.[language] || category;
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className={`min-h-screen bg-gray-50 py-12 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link to={createPageUrl('Menu')}>
            <Button variant="ghost" className="mb-4 text-gray-600 hover:text-gray-900">
              <BackArrow className="w-4 h-4 mr-2" />
              {isRTL ? 'חזרה לתפריט' : 'Back to Menu'}
            </Button>
          </Link>
          
          <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
              {getCategoryName()}
            </h1>
            <div className={`w-24 h-1 bg-red-600 ${isRTL ? 'mr-0' : 'ml-0'}`} />
            <p className="text-gray-600 mt-4">
              {dishes.length} {isRTL ? 'פריטים' : 'items'}
            </p>
          </div>
        </motion.div>

        {/* Dishes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dishes.map((dish, index) => (
            <DishCard key={dish.id} dish={dish} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}