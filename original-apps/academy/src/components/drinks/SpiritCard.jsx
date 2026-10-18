import React from 'react';
import { useAutoTranslate } from '@/components/hooks/useAutoTranslate';

export default function SpiritCard({ spirit }) {
  const { translatedText: translatedBrand } = useAutoTranslate(spirit.brand_name || '');
  const { translatedText: translatedDesc } = useAutoTranslate(spirit.description || '');

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
      <h3 className="font-semibold text-lg mb-2">{translatedBrand}</h3>
      {spirit.description && (
        <p className="text-sm text-gray-600">{translatedDesc}</p>
      )}
    </div>
  );
}