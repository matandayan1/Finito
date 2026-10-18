import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';
import LazyImage from '@/components/ui/LazyImage';
import MenuItemForm from '@/components/admin/MenuItemForm';
import AdminPinDialog from '@/components/ui/AdminPinDialog';

export default function MenuCard({ item }) {
  const { t, language } = useLanguage();
  const [pinOpen, setPinOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const imageSrc = item.image_file || item.image_url || null;
  // item already comes pre-translated from the parent page via usePageTranslation
  const name = language === 'en' && item.name_en ? item.name_en : item.name_he;
  const shortStory = item.short_story;

  const allergenColors = {
    'Fish': 'bg-blue-100 text-blue-800',
    'Shellfish': 'bg-cyan-100 text-cyan-800',
    'Gluten': 'bg-amber-100 text-amber-800',
    'Soy': 'bg-yellow-100 text-yellow-800',
    'Eggs': 'bg-orange-100 text-orange-800',
    'Dairy': 'bg-purple-100 text-purple-800',
    'Sesame': 'bg-green-100 text-green-800',
    'Mushrooms': 'bg-gray-100 text-gray-800'
  };

  return (
    <>
    <Card className="group overflow-hidden hover:shadow-md transition-shadow border-neutral-200 bg-white relative">
      <button
        onClick={() => setPinOpen(true)}
        className="absolute top-2 left-2 z-10 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-all opacity-0 group-hover:opacity-100"
        title="ערוך מנה"
      >
        <Pencil className="w-3.5 h-3.5 text-neutral-600" />
      </button>
      <LazyImage
        src={imageSrc}
        alt={name}
        containerClassName="aspect-[4/3] w-full"
        className="w-full h-full object-cover"
      />
      <CardContent className="p-5">
        <h3 className="font-medium text-lg mb-2 text-neutral-900 leading-snug">{name}</h3>
        <p className="text-sm text-neutral-600 mb-4 line-clamp-2 leading-relaxed">{shortStory}</p>
        
        {item.allergens && item.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.allergens.map(allergen => (
              <span 
                key={allergen} 
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${allergenColors[allergen] || 'bg-neutral-100 text-neutral-800'}`}
              >
                {t(allergen.toLowerCase())}
              </span>
            ))}
          </div>
        )}

        <Link 
          to={createPageUrl(`MenuItem?id=${item.id}`)}
          onClick={() => {
            sessionStorage.setItem('menuScrollY', window.scrollY.toString());
          }}
        >
          <Button className="w-full border-neutral-300 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-all" variant="outline">
            {t('details')}
          </Button>
        </Link>
      </CardContent>
    </Card>

    <AdminPinDialog open={pinOpen} onClose={() => setPinOpen(false)} onSuccess={() => { setPinOpen(false); setEditOpen(true); }} />
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <MenuItemForm item={item} onClose={() => setEditOpen(false)} />
      </DialogContent>
    </Dialog>
    </>
  );
}