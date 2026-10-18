import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/components/LanguageContext';
import { Wine, Droplets, AlertCircle, Pencil } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import DrinkItemForm from '@/components/admin/DrinkItemForm';
import AdminPinDialog from '@/components/ui/AdminPinDialog';

export default function DrinkCard({ drink }) {
  const { t, isRTL } = useLanguage();
  const [pinOpen, setPinOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

  const imageSrc = drink.image_file || drink.image_url || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400';

  return (
    <>
    <div className="block group relative">
      <button
        onClick={(e) => { e.preventDefault(); setPinOpen(true); }}
        className="absolute top-2 left-2 z-10 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-all opacity-0 group-hover:opacity-100"
        title="ערוך משקה"
      >
        <Pencil className="w-3.5 h-3.5 text-neutral-600" />
      </button>
    <Link 
      to={`${createPageUrl('DrinkItem')}?id=${drink.id}`}
      className="block"
    >
      <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 border-neutral-200 bg-white">
        <div className="relative h-56 overflow-hidden bg-neutral-100">
          <img 
            src={imageSrc}
            alt={drink.name_he}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          {drink.alcohol_content && drink.alcohol_content !== 'None' && (
            <div className={`absolute top-3 right-3 ${alcoholColorMap[drink.alcohol_content]} px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm`}>
              <Wine className="w-3 h-3" />
              {t(drink.alcohol_content.toLowerCase().replace(' ', ''))}
            </div>
          )}
        </div>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className={`text-lg font-medium text-neutral-900 ${isRTL ? 'text-right' : 'text-left'}`}>
              {drink.name_en || drink.name_he}
            </h3>
          </div>
          
          {drink.flavor_profile && (
            <div className="mb-3">
              <span className={`${flavorColorMap[drink.flavor_profile]} px-2.5 py-1 rounded-full text-xs font-medium`}>
                {t(drink.flavor_profile.toLowerCase())}
              </span>
            </div>
          )}

          {drink.description && (
            <p className={`text-sm text-neutral-600 line-clamp-2 mb-3 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
              {drink.description}
            </p>
          )}

          {drink.garnish && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
              <Droplets className="w-3 h-3" />
              <span className="line-clamp-1">{drink.garnish}</span>
            </div>
          )}

          {drink.allergens && drink.allergens.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700">
              <AlertCircle className="w-3 h-3" />
              <span>{drink.allergens.join(', ')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
    </div>

    <AdminPinDialog open={pinOpen} onClose={() => setPinOpen(false)} onSuccess={() => { setPinOpen(false); setEditOpen(true); }} />
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DrinkItemForm drink={drink} onClose={() => setEditOpen(false)} />
      </DialogContent>
    </Dialog>
    </>
  );
}