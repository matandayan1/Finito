/**
 * Hook for page-level batch translation.
 * Translates all items at once with ONE AI call per language.
 * Uses the global TranslationService cache.
 */
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { translateBatch, getCachedItem, subscribe, isTranslating } from '@/lib/translationService';

/**
 * Translate a list of items in one batch.
 * @param {string} entityType - e.g. 'menu', 'drinks'
 * @param {Array} items - array of entity objects (must have .id)
 * @param {string[]} fields - fields to translate
 * @returns {{ getTranslated: (item) => item, loading: boolean }}
 */
export function usePageTranslation(entityType, items, fields) {
  const { language } = useLanguage();
  const [tick, setTick] = useState(0);

  const forceUpdate = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (language === 'he' || !items?.length) return;

    // Start batch translation (no-op if already cached/in-progress)
    translateBatch(entityType, language, items, fields);

    // Subscribe to cache updates
    const unsub = subscribe(entityType, language, forceUpdate);
    return unsub;
  }, [entityType, language, items?.length]);

  const getTranslated = useCallback((item) => {
    if (!item) return item;
    if (language === 'he') return item;

    const cached = getCachedItem(entityType, language, item.id);
    if (!cached) return item; // Show original while loading

    return { ...item, ...cached };
  }, [entityType, language, tick]);

  const loading = language !== 'he' && items?.length > 0 && isTranslating(entityType, language);

  return { getTranslated, loading };
}

/**
 * Translate a single item (for detail pages).
 * Reuses the batch cache if available, otherwise falls back to single-item translation.
 */
export function useSingleTranslation(entityType, item, fields) {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState(item);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!item) return;
    if (language === 'he') { setTranslated(item); return; }

    // Check batch cache first (free!)
    const cached = getCachedItem(entityType, language, item.id);
    if (cached) {
      setTranslated({ ...item, ...cached });
      return;
    }

    // Not in batch cache - do single item translation
    setLoading(true);
    translateBatch(entityType, language, [item], fields).then(() => {
      const c = getCachedItem(entityType, language, item.id);
      setTranslated(c ? { ...item, ...c } : item);
      setLoading(false);
    });
  }, [item?.id, language]);

  return { translated: translated || item, loading };
}