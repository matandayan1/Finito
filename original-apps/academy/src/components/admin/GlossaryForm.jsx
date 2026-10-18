import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function GlossaryForm({ term, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(term || {
    term: '',
    he: '',
    meaning: '',
    how_to_explain: ''
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (term?.id) {
        return await base44.entities.Glossary.update(term.id, data);
      } else {
        return await base44.entities.Glossary.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['glossary'] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{term ? 'ערוך מונח' : 'הוסף מונח חדש'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>מונח (English)</Label>
              <Input
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>עברית</Label>
              <Input
                value={formData.he}
                onChange={(e) => setFormData({ ...formData, he: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>משמעות</Label>
            <Textarea
              value={formData.meaning}
              onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>איך להסביר</Label>
            <Textarea
              value={formData.how_to_explain}
              onChange={(e) => setFormData({ ...formData, how_to_explain: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'שומר...' : 'שמור'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}