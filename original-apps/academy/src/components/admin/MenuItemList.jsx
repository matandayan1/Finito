import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

export default function MenuItemList({ items, onEdit, onDelete }) {
  const categories = ['Starters', 'Sushi', 'Skewers', 'Ippin', 'Izakaya', 'Ramen', 'Rice', 'Soup', 'Desserts'];

  return (
    <div className="space-y-6">
      {categories.map(cat => {
        const categoryItems = items.filter(item => item.category === cat);
        if (categoryItems.length === 0) return null;

        return (
          <div key={cat}>
            <h3 className="text-xl font-semibold mb-3">{cat}</h3>
            <div className="space-y-2">
              {categoryItems.map(item => (
                <Card key={item.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      {item.image_file && (
                        <img src={item.image_file} alt={item.name_he} className="w-16 h-16 object-cover rounded" />
                      )}
                      <div>
                        <p className="font-semibold">{item.name_he}</p>
                        <p className="text-sm text-gray-600">{item.name_en}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}