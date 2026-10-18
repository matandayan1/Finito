import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function MenuCategoryCard({ category, index }) {
  const { language, isRTL } = useLanguage();

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
    return names[category.id]?.[language] || category.id;
  };

  const images = {
    starters: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400',
    sushi: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400',
    yakitori: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400',
    ippin: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400',
    izakaya: 'https://images.unsplash.com/photo-1581167983451-08e3c76d9b4a?w=400',
    ramen: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400',
    rice: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400',
    soup: 'https://images.unsplash.com/photo-1607301405390-d831c242f59b?w=400',
    sweets: 'https://images.unsplash.com/photo-1558462738-d25b64cbc1b9?w=400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link to={createPageUrl(`MenuCategory?category=${category.id}`)}>
        <div className="group relative overflow-hidden rounded-xl bg-black cursor-pointer">
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={images[category.id]}
              alt={getCategoryName()}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className={`absolute bottom-0 left-0 right-0 p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            <h3 className="text-2xl font-bold text-white mb-1">{getCategoryName()}</h3>
            <p className="text-white/70 text-sm">{category.count} items</p>
          </div>
          
          {/* Hover effect */}
          <div className="absolute inset-0 border-2 border-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>
    </motion.div>
  );
}