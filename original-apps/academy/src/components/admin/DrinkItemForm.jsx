import React, { useState } from 'react';
import { compressImage } from '@/lib/imageUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Upload, Loader2 } from 'lucide-react';

export default function DrinkItemForm({ drink, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(drink || {
    item_id: '',
    category: 'Cocktails',
    flavor_profile: 'Sweet',
    name_he: '',
    name_en: '',
    ingredients: [],
    garnish: '',
    description: '',
    staff_notes: '',
    allergens: [],
    sensitivity_notes: '',
    alcohol_content: 'Medium',
    spirit_type: '',
    brand_name: '',
    sort_order: 0,
  });

  const [ingredientInput, setIngredientInput] = useState('');
  const [allergenInput, setAllergenInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (drink) {
        return base44.entities.DrinkItem.update(drink.id, data);
      } else {
        return base44.entities.DrinkItem.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drinkItems'] });
      onClose();
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const compressed = await compressImage(file);
    const result = await base44.integrations.Core.UploadFile({ file: compressed });
    setFormData(prev => ({ ...prev, image_file: result.file_url }));
    setUploading(false);
  };

  const addIngredient = () => {
    if (ingredientInput.trim()) {
      setFormData({
        ...formData,
        ingredients: [...(formData.ingredients || []), ingredientInput.trim()]
      });
      setIngredientInput('');
    }
  };

  const removeIngredient = (index) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    });
  };

  const addAllergen = () => {
    if (allergenInput.trim()) {
      setFormData({
        ...formData,
        allergens: [...(formData.allergens || []), allergenInput.trim()]
      });
      setAllergenInput('');
    }
  };

  const removeAllergen = (index) => {
    setFormData({
      ...formData,
      allergens: formData.allergens.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{drink ? 'ערוך משקה' : 'הוסף משקה'}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">מזהה</label>
              <Input
                value={formData.item_id}
                onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                placeholder="cocktail_001"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">קטגוריה</label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cocktails">קוקטיילים</SelectItem>
                  <SelectItem value="Mocktails">משקאות ללא אלכוהול</SelectItem>
                  <SelectItem value="Spirits">משקאות חריפים</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">שם בעברית</label>
              <Input
                value={formData.name_he}
                onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">שם באנגלית</label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              />
            </div>

            {formData.category !== 'Spirits' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">פרופיל טעם</label>
                  <Select value={formData.flavor_profile} onValueChange={(value) => setFormData({ ...formData, flavor_profile: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bitter">מר</SelectItem>
                      <SelectItem value="Sour">חמוץ</SelectItem>
                      <SelectItem value="Sweet">מתוק</SelectItem>
                      <SelectItem value="Fresh">רענן</SelectItem>
                      <SelectItem value="Complex">מורכב</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">תכולת אלכוהול</label>
                  <Select value={formData.alcohol_content} onValueChange={(value) => setFormData({ ...formData, alcohol_content: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">ללא</SelectItem>
                      <SelectItem value="Low">נמוך</SelectItem>
                      <SelectItem value="Medium">בינוני</SelectItem>
                      <SelectItem value="High">גבוה</SelectItem>
                      <SelectItem value="Very High">גבוה מאוד</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.category === 'Spirits' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">סוג משקה</label>
                  <Input
                    value={formData.spirit_type}
                    onChange={(e) => setFormData({ ...formData, spirit_type: e.target.value })}
                    placeholder="Vodka, Gin, Rum..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">שם מותג</label>
                  <Input
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">תיאור</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {formData.category !== 'Spirits' && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">מרכיבים</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    placeholder="הוסף מרכיב"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                  />
                  <Button type="button" onClick={addIngredient}>הוסף</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.ingredients?.map((ing, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      {ing}
                      <button type="button" onClick={() => removeIngredient(idx)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">קישוט</label>
                <Input
                  value={formData.garnish}
                  onChange={(e) => setFormData({ ...formData, garnish: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">אלרגנים</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={allergenInput}
                    onChange={(e) => setAllergenInput(e.target.value)}
                    placeholder="הוסף אלרגן"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergen())}
                  />
                  <Button type="button" onClick={addAllergen}>הוסף</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.allergens?.map((allergen, idx) => (
                    <span key={idx} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      {allergen}
                      <button type="button" onClick={() => removeAllergen(idx)} className="hover:text-orange-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">הערות רגישות</label>
                <Input
                  value={formData.sensitivity_notes}
                  onChange={(e) => setFormData({ ...formData, sensitivity_notes: e.target.value })}
                  placeholder="חריף, קפאין, וכו'"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">הערות לצוות</label>
                <Textarea
                  value={formData.staff_notes}
                  onChange={(e) => setFormData({ ...formData, staff_notes: e.target.value })}
                  rows={2}
                />
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">תמונה</label>
            <div className="flex items-center gap-4">
              <Button type="button" variant="outline" onClick={() => document.getElementById('drink-image-upload').click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                העלה תמונה
              </Button>
              <input
                id="drink-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {formData.image_file && (
                <img src={formData.image_file} alt="Preview" className="h-20 w-20 object-cover rounded" />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>ביטול</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'שומר...' : 'שמור'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}