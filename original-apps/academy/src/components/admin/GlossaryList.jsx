import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

export default function GlossaryList({ terms, onEdit, onDelete }) {
  return (
    <div className="space-y-2">
      {terms.map(term => (
        <Card key={term.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{term.term} / {term.he}</p>
              <p className="text-sm text-gray-600">{term.meaning}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(term)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(term.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}