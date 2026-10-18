import React, { useState, useRef } from 'react';
import { compressImage } from '@/lib/imageUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MenuItemForm({ item, onClose }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState(item || {
    item_id: '',
    category: 'Starters',
    name_he: '',
    name_en: '',
    jp_term: '',
    pronunciation: '',
    short_story: '',
    ingredients: [],
    modifiable_options: [],
    not_modifiable_reason: '',
    allergens: [],
    pregnancy_note: 'OK',
    staff_notes: '',
    image_file: '',
    image_url: '',
    sort_order: 0
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (item?.id) {
        return await base44.entities.MenuItem.update(item.id, data);
      } else {
        return await base44.entities.MenuItem.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menuItems'] });
      onClose();
    },
    onError: (err) => {
      setError('שגיאה בשמירה: ' + (err?.message || 'אנא נסה שוב'));
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const compressed = await compressImage(file);
    const result = await base44.integrations.Core.UploadFile({ file: compressed });
    setFormData(prev => ({ ...prev, image_file: result.file_url }));
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const categories = ['Starters', 'Sushi', 'Skewers', 'Ippin', 'Izakaya', 'Ramen', 'Rice', 'Soup', 'Desserts'];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{item ? 'ערוך מנה' : 'הוסף מנה חדשה'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>מזהה ייחודי</Label>
              <Input
                value={formData.item_id}
                onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>קטגוריה</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>שם עברית</Label>
              <Input
                value={formData.name_he}
                onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>שם אנגלית</Label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>סיפור קצר</Label>
            <Textarea
              value={formData.short_story}
              onChange={(e) => setFormData({ ...formData, short_story: e.target.value })}
            />
          </div>

          <div>
            <Label>מרכיבים (פסיק מפריד)</Label>
            <Textarea
              value={Array.isArray(formData.ingredients) ? formData.ingredients.join(', ') : ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                ingredients: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
              })}
            />
          </div>

          <div>
            <Label>תמונה</Label>
            <div className="space-y-2">
              <Input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && (
                <p className="text-sm text-gray-500">מעלה תמונה...</p>
              )}
              {formData.image_file && (
                <div className="border rounded-lg p-2">
                  <img src={formData.image_file} alt="Preview" className="h-32 object-cover rounded mb-2" />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      החלף תמונה
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, image_file: '' }))}
                    >
                      הסר תמונה
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>אלרגיות</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {['Fish', 'Shellfish', 'Gluten', 'Soy', 'Eggs', 'Dairy', 'Sesame', 'Mushrooms', 'Kosher', 'Sesame Seeds'].map(allergen => {
                const checked = Array.isArray(formData.allergens) && formData.allergens.includes(allergen);
                return (
                  <button
                    key={allergen}
                    type="button"
                    onClick={() => {
                      const current = Array.isArray(formData.allergens) ? formData.allergens : [];
                      setFormData({
                        ...formData,
                        allergens: checked ? current.filter(a => a !== allergen) : [...current, allergen]
                      });
                    }}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      checked ? 'bg-amber-100 border-amber-500 text-amber-800' : 'bg-white border-gray-300 text-gray-600 hover:border-amber-400'
                    }`}
                  >
                    {allergen}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>הערת הריון</Label>
            <Select value={formData.pregnancy_note} onValueChange={(v) => setFormData({ ...formData, pregnancy_note: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OK">OK</SelectItem>
                <SelectItem value="Depends">Depends</SelectItem>
                <SelectItem value="Not recommended">Not recommended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>הערות לצוות</Label>
            <Textarea
              value={formData.staff_notes}
              onChange={(e) => setFormData({ ...formData, staff_notes: e.target.value })}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saveMutation.isPending || uploading}>
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