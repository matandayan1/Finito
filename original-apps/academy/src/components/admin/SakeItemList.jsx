import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pencil, Trash2 } from 'lucide-react';

export default function SakeItemList({ items, onEdit, onDelete }) {
  const categories = {
    'Dry': 'חד ויבש',
    'Earthy': 'אדמתי ומלא',
    'Umami': 'אומאמי ועשיר',
    'Aromatic': 'ארומתי ופירותי'
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(groupedItems).map(([category, categoryItems]) => (
        <div key={category}>
          <h3 className="text-xl font-semibold mb-4">{categories[category]}</h3>
          <div className="grid gap-4">
            {categoryItems
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
              .map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start gap-4">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name_he}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-lg">{item.name_he}</h4>
                          <p className="text-sm text-gray-600">{item.name_en}</p>
                          <div className="flex gap-2 mt-2 text-xs">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {item.brewery}
                            </span>
                            {item.alcohol && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                                {item.alcohol}
                              </span>
                            )}
                            {item.grade && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                {item.grade}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(item)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (confirm('למחוק את הפריט?')) {
                                onDelete(item.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}