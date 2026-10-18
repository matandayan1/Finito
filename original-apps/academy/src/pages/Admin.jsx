import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Lock } from 'lucide-react';
import MenuItemForm from '@/components/admin/MenuItemForm';
import MenuItemList from '@/components/admin/MenuItemList';
import GlossaryForm from '@/components/admin/GlossaryForm';
import GlossaryList from '@/components/admin/GlossaryList';
import DrinkItemForm from '@/components/admin/DrinkItemForm';
import DrinkItemList from '@/components/admin/DrinkItemList';
import SakeItemForm from '@/components/admin/SakeItemForm';
import SakeItemList from '@/components/admin/SakeItemList';

export default function Admin() {
  const { t, isRTL } = useLanguage();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [editingGlossary, setEditingGlossary] = useState(null);
  const [editingDrink, setEditingDrink] = useState(null);
  const [editingSake, setEditingSake] = useState(null);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showGlossaryForm, setShowGlossaryForm] = useState(false);
  const [showDrinkForm, setShowDrinkForm] = useState(false);
  const [showSakeForm, setShowSakeForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: glossary = [] } = useQuery({
    queryKey: ['glossary'],
    queryFn: () => base44.entities.Glossary.list(),
  });

  const { data: drinks = [] } = useQuery({
    queryKey: ['drinkItems'],
    queryFn: () => base44.entities.DrinkItem.list(),
  });

  const { data: sakeItems = [] } = useQuery({
    queryKey: ['sakeItems'],
    queryFn: () => base44.entities.SakeItem.list(),
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (id) => base44.entities.MenuItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menuItems'] }),
  });

  const deleteGlossaryMutation = useMutation({
    mutationFn: (id) => base44.entities.Glossary.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['glossary'] }),
  });

  const deleteDrinkMutation = useMutation({
    mutationFn: (id) => base44.entities.DrinkItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drinkItems'] }),
  });

  const saveSakeMutation = useMutation({
    mutationFn: async (data) => {
      if (data.id) {
        return base44.entities.SakeItem.update(data.id, data);
      }
      return base44.entities.SakeItem.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sakeItems'] });
      setShowSakeForm(false);
      setEditingSake(null);
    },
  });

  const deleteSakeMutation = useMutation({
    mutationFn: (id) => base44.entities.SakeItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sakeItems'] }),
  });

  const handleEditMenuItem = (item) => {
    setEditingMenuItem(item);
    setShowMenuForm(true);
  };

  const handleEditGlossary = (term) => {
    setEditingGlossary(term);
    setShowGlossaryForm(true);
  };

  const handleEditDrink = (drink) => {
    setEditingDrink(drink);
    setShowDrinkForm(true);
  };

  const handleEditSake = (sake) => {
    setEditingSake(sake);
    setShowSakeForm(true);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'manager123') {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              כניסה למנהל
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="הזן סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-center"
                />
              </div>
              <Button type="submit" className="w-full">
                כניסה
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-light text-gray-900 mb-6">{t('admin')}</h1>

        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="menu">ניהול תפריט</TabsTrigger>
            <TabsTrigger value="drinks">ניהול משקאות</TabsTrigger>
            <TabsTrigger value="sake">ניהול סאקה</TabsTrigger>
            <TabsTrigger value="glossary">ניהול מילון</TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <div className="mb-4">
              <Button onClick={() => { setEditingMenuItem(null); setShowMenuForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                הוסף מנה
              </Button>
            </div>

            {showMenuForm && (
              <MenuItemForm
                item={editingMenuItem}
                onClose={() => { setShowMenuForm(false); setEditingMenuItem(null); }}
              />
            )}

            <MenuItemList
              items={menuItems}
              onEdit={handleEditMenuItem}
              onDelete={(id) => deleteMenuItemMutation.mutate(id)}
            />
          </TabsContent>

          <TabsContent value="drinks">
            <div className="mb-4">
              <Button onClick={() => { setEditingDrink(null); setShowDrinkForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                הוסף משקה
              </Button>
            </div>

            {showDrinkForm && (
              <DrinkItemForm
                drink={editingDrink}
                onClose={() => { setShowDrinkForm(false); setEditingDrink(null); }}
              />
            )}

            <DrinkItemList
              drinks={drinks}
              onEdit={handleEditDrink}
              onDelete={(id) => deleteDrinkMutation.mutate(id)}
            />
          </TabsContent>

          <TabsContent value="sake">
            <div className="mb-4">
              <Button onClick={() => { setEditingSake(null); setShowSakeForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                הוסף סאקה
              </Button>
            </div>

            {showSakeForm && (
              <SakeItemForm
                item={editingSake}
                onSave={(data) => saveSakeMutation.mutate(data)}
                onCancel={() => { setShowSakeForm(false); setEditingSake(null); }}
              />
            )}

            <SakeItemList
              items={sakeItems}
              onEdit={handleEditSake}
              onDelete={(id) => deleteSakeMutation.mutate(id)}
            />
          </TabsContent>

          <TabsContent value="glossary">
            <div className="mb-4">
              <Button onClick={() => { setEditingGlossary(null); setShowGlossaryForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                הוסף מונח
              </Button>
            </div>

            {showGlossaryForm && (
              <GlossaryForm
                term={editingGlossary}
                onClose={() => { setShowGlossaryForm(false); setEditingGlossary(null); }}
              />
            )}

            <GlossaryList
              terms={glossary}
              onEdit={handleEditGlossary}
              onDelete={(id) => deleteGlossaryMutation.mutate(id)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}