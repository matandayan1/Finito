import React from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MenuFilters({ filters, onFilterChange, onClearFilters }) {
  const { t, isRTL } = useLanguage();

  const allergenOptions = [
    { value: 'Fish', label: t('fish') },
    { value: 'Shellfish', label: t('shellfish') },
    { value: 'Gluten', label: t('gluten') },
    { value: 'Soy', label: t('soy') },
    { value: 'Eggs', label: t('eggs') },
    { value: 'Dairy', label: t('dairy') },
    { value: 'Sesame', label: t('sesame') },
    { value: 'Mushrooms', label: t('mushrooms') },
  ];

  const pregnancyOptions = [
    { value: 'OK', label: t('ok') },
    { value: 'Depends', label: t('depends') },
    { value: 'Not recommended', label: t('notRecommended') },
  ];

  const toggleAllergen = (allergen) => {
    const current = filters.excludeAllergens || [];
    const updated = current.includes(allergen)
      ? current.filter(a => a !== allergen)
      : [...current, allergen];
    onFilterChange({ ...filters, excludeAllergens: updated });
  };

  const togglePregnancy = (status) => {
    const current = filters.pregnancySafe || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFilterChange({ ...filters, pregnancySafe: updated });
  };

  const hasActiveFilters = 
    (filters.excludeAllergens?.length > 0) || 
    (filters.pregnancySafe?.length > 0);

  return (
    <div className={`flex flex-wrap items-center gap-3 mb-6 ${isRTL ? 'rtl' : ''}`}>
      {/* Allergen Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            {t('allergens')}
            {filters.excludeAllergens?.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                {filters.excludeAllergens.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? "end" : "start"} className="w-56">
          <DropdownMenuLabel>סנן אלרגנים</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allergenOptions.map(option => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.excludeAllergens?.includes(option.value)}
              onCheckedChange={() => toggleAllergen(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Pregnancy Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            {t('pregnancyNote')}
            {filters.pregnancySafe?.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                {filters.pregnancySafe.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? "end" : "start"} className="w-56">
          <DropdownMenuLabel>סנן לפי הריון</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {pregnancyOptions.map(option => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={filters.pregnancySafe?.includes(option.value)}
              onCheckedChange={() => togglePregnancy(option.value)}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearFilters}
          className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="w-4 h-4" />
          נקה סינון
        </Button>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.excludeAllergens?.map(allergen => (
            <Badge key={allergen} variant="secondary" className="gap-1">
              {allergenOptions.find(o => o.value === allergen)?.label}
              <button
                onClick={() => toggleAllergen(allergen)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {filters.pregnancySafe?.map(status => (
            <Badge key={status} variant="secondary" className="gap-1">
              {pregnancyOptions.find(o => o.value === status)?.label}
              <button
                onClick={() => togglePregnancy(status)}
                className="ml-1 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}