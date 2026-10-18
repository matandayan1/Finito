/**
 * Global Translation Service - translates all data in one AI call per language
 * Cache is stored in memory for the session (resets on page reload)
 */

import { base44 } from '@/api/base44Client';

const LANG_NAMES = { en: 'English', fr: 'French', ja: 'Japanese', ru: 'Russian' };

// Global cache: { [entityType_language]: { [itemId]: translatedFields } }
const cache = {};
// Track in-progress translations to avoid duplicate calls
const inProgress = {};
// Listeners for cache updates
const listeners = {};

function cacheKey(entityType, language) {
  return `${entityType}_${language}`;
}

function notify(key) {
  if (listeners[key]) {
    listeners[key].forEach(fn => fn());
  }
}

export function subscribe(entityType, language, callback) {
  const key = cacheKey(entityType, language);
  if (!listeners[key]) listeners[key] = new Set();
  listeners[key].add(callback);
  return () => listeners[key]?.delete(callback);
}

export function getCachedItem(entityType, language, itemId) {
  const key = cacheKey(entityType, language);
  return cache[key]?.[itemId] || null;
}

export function isTranslating(entityType, language) {
  return !!inProgress[cacheKey(entityType, language)];
}

/**
 * Translate a batch of items for an entity type.
 * Only makes ONE AI call per entityType+language combination.
 * Returns immediately if already cached or in progress.
 */
export async function translateBatch(entityType, language, items, fieldsToTranslate) {
  if (language === 'he' || !items?.length) return;

  const key = cacheKey(entityType, language);

  // Already fully cached
  if (cache[key]) return;
  // Already in progress
  if (inProgress[key]) return;

  inProgress[key] = true;

  try {
    const targetLanguage = LANG_NAMES[language] || 'English';

    // Build minimal payload - only the fields we need
    const payload = items.map(item => {
      const obj = { _id: item.id };
      fieldsToTranslate.forEach(field => {
        if (item[field]) obj[field] = item[field];
      });
      return obj;
    });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Translate the following JSON array from Hebrew to ${targetLanguage}. 
Translate ONLY the text field values (not keys, not _id). 
Return ONLY valid JSON array with same structure and _id preserved.
Do NOT translate proper nouns, brand names, or technical terms.
Array: ${JSON.stringify(payload)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { type: 'object' }
          }
        }
      }
    });

    const translated = result?.items || [];
    cache[key] = {};
    translated.forEach(t => {
      if (t._id) {
        const { _id, ...fields } = t;
        cache[key][_id] = fields;
      }
    });
  } catch (err) {
    console.error('Batch translation failed:', err);
    // On error, create empty cache so we don't retry endlessly
    cache[key] = {};
  } finally {
    delete inProgress[key];
    notify(key);
  }
}