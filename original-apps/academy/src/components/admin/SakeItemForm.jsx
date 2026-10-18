import React, { useState, useEffect } from 'react';
import { compressImage } from '@/lib/imageUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

export default function SakeItemForm({ item, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name_he: '',
    name_en: '',
    category: 'Dry',
    brewery: '',
    alcohol: '',
    polish_ratio: '',
    grade: '',
    temperature: '',
    profile: '',
    description: '',
    food_pairing: '',
    image_url: '',
    sort_order: 0,
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
    }
  }, [item]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setUploading(true);

    try {
      const compressed = await compressImage(file);
      const result = await base44.integrations.Core.UploadFile({ file: compressed });
      setFormData({ ...formData, image_url: result.file_url });
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('שגיאה בהעלאת תמונה');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>שם עברי</Label>
          <Input
            value={formData.name_he}
            onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>English Name</Label>
          <Input
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label>קטגוריה</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Dry">חד ויבש</SelectItem>
            <SelectItem value="Earthy">אדמתי ומלא</SelectItem>
            <SelectItem value="Umami">אומאמי ועשיר</SelectItem>
            <SelectItem value="Aromatic">ארומתי ופירותי</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>מבשלה</Label>
          <Input
            value={formData.brewery}
            onChange={(e) => setFormData({ ...formData, brewery: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>אחוז אלכוהול</Label>
          <Input
            value={formData.alcohol}
            onChange={(e) => setFormData({ ...formData, alcohol: e.target.value })}
            placeholder="15.5%"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>יחס שיוף</Label>
          <Input
            value={formData.polish_ratio}
            onChange={(e) => setFormData({ ...formData, polish_ratio: e.target.value })}
            placeholder="שיוף 65%"
          />
        </div>
        <div>
          <Label>דרגה</Label>
          <Input
            value={formData.grade}
            onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
            placeholder="הונג'וזו"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>טמפרטורת הגשה</Label>
          <Input
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
            placeholder="חם (40-60°C) או קר (6-12°C)"
          />
        </div>
        <div>
          <Label>פרופיל טעם</Label>
          <Input
            value={formData.profile}
            onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
            placeholder="חצי יבש, גוף קל"
          />
        </div>
      </div>

      <div>
        <Label>תיאור</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>

      <div>
        <Label>התאמה לאוכל</Label>
        <Textarea
          value={formData.food_pairing}
          onChange={(e) => setFormData({ ...formData, food_pairing: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label>תמונה</Label>
        <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
        {formData.image_url && (
          <div className="mt-2">
            <img src={formData.image_url} alt="Preview" className="w-32 h-32 object-cover rounded" />
          </div>
        )}
      </div>

      <div>
        <Label>סדר תצוגה</Label>
        <Input
          type="number"
          value={formData.sort_order}
          onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? 'מעלה...' : 'שמור'}
        </Button>
      </div>
    </form>
  );
}