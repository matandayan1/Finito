import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Wine } from 'lucide-react';

export default function DrinkItemList({ drinks, onEdit, onDelete }) {
  const groupedDrinks = drinks.reduce((acc, drink) => {
    const category = drink.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(drink);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedDrinks).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Wine className="w-5 h-5" />
            {category === 'Cocktails' ? 'קוקטיילים' : category === 'Mocktails' ? 'משקאות ללא אלכוהול' : 'משקאות חריפים'}
            <span className="text-sm text-gray-500">({items.length})</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((drink) => (
              <Card key={drink.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{drink.name_he}</h4>
                      {drink.name_en && (
                        <p className="text-sm text-gray-600">{drink.name_en}</p>
                      )}
                      {drink.brand_name && (
                        <p className="text-sm text-gray-500">{drink.brand_name}</p>
                      )}
                    </div>
                    {(drink.image_file || drink.image_url) && (
                      <img 
                        src={drink.image_file || drink.image_url} 
                        alt={drink.name_he}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                  </div>
                  
                  {drink.flavor_profile && (
                    <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs mb-2">
                      {drink.flavor_profile}
                    </span>
                  )}
                  
                  {drink.alcohol_content && drink.alcohol_content !== 'None' && (
                    <span className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs mb-2 ml-2">
                      אלכוהול: {drink.alcohol_content}
                    </span>
                  )}
                  
                  {drink.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {drink.description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onEdit(drink)}
                      className="flex-1"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      ערוך
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        if (window.confirm('האם למחוק משקה זה?')) {
                          onDelete(drink.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      
      {drinks.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-500">אין משקאות להצגה</p>
        </Card>
      )}
    </div>
  );
}