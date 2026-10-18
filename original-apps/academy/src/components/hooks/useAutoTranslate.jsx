import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';

const translationCache = new Map();

export function useAutoTranslate(text, sourceLanguage = 'he') {
  const { language } = useLanguage();
  const [translatedText, setTranslatedText] = useState(text);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    // אם השפה היא עברית או אין טקסט, אין צורך בתרגום
    if (language === 'he' || !text || text.trim() === '') {
      setTranslatedText(text);
      return;
    }

    const cacheKey = `${text}_${language}`;
    
    // בדיקה אם יש תרגום שמור במטמון
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey));
      return;
    }

    // תרגום באמצעות AI
    const translateText = async () => {
      setIsTranslating(true);
      try {
        const languageNames = {
          'en': 'English',
          'fr': 'French',
          'ja': 'Japanese',
          'ru': 'Russian'
        };

        const targetLanguage = languageNames[language] || 'English';
        
        const prompt = `Translate the following Hebrew text to ${targetLanguage}. Return ONLY the translation, no explanations:

"${text}"`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
        });

        const translation = result.trim();
        translationCache.set(cacheKey, translation);
        setTranslatedText(translation);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedText(text); // במקרה של שגיאה, נציג את הטקסט המקורי
      } finally {
        setIsTranslating(false);
      }
    };

    translateText();
  }, [text, language]);

  return { translatedText, isTranslating };
}

export function useAutoTranslateObject(obj, fields = []) {
  const { language } = useLanguage();
  const [translatedObj, setTranslatedObj] = useState(obj);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (language === 'he' || !obj) {
      setTranslatedObj(obj);
      return;
    }

    const translateObject = async () => {
      setIsTranslating(true);
      const translated = { ...obj };
      
      try {
        const textsToTranslate = [];
        const fieldMapping = [];

        // Collect all texts to translate (strings and arrays)
        fields.forEach(field => {
          if (!obj[field]) return;

          if (typeof obj[field] === 'string') {
            textsToTranslate.push(obj[field]);
            fieldMapping.push({ field, isArray: false });
          } else if (Array.isArray(obj[field])) {
            obj[field].forEach(item => {
              if (typeof item === 'string') {
                textsToTranslate.push(item);
                fieldMapping.push({ field, isArray: true });
              }
            });
          }
        });

        if (textsToTranslate.length === 0) {
          setTranslatedObj(obj);
          setIsTranslating(false);
          return;
        }

        const languageNames = {
          'en': 'English',
          'fr': 'French',
          'ja': 'Japanese',
          'ru': 'Russian'
        };

        const targetLanguage = languageNames[language] || 'English';
        
        const prompt = `Translate the following Hebrew texts to ${targetLanguage}. Return ONLY the translations in JSON format as an array, preserving the order. No explanations, just the JSON array:

${JSON.stringify(textsToTranslate, null, 2)}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              translations: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        const translations = result.translations || [];
        
        // Map translations back to fields
        let translationIndex = 0;
        const arrayFields = {};

        fieldMapping.forEach(({ field, isArray }) => {
          if (translationIndex >= translations.length) return;

          if (isArray) {
            if (!arrayFields[field]) {
              arrayFields[field] = [];
            }
            arrayFields[field].push(translations[translationIndex]);
          } else {
            translated[field] = translations[translationIndex];
          }
          translationIndex++;
        });

        // Set array fields
        Object.keys(arrayFields).forEach(field => {
          translated[field] = arrayFields[field];
        });

        setTranslatedObj(translated);
      } catch (error) {
        console.error('Translation error:', error);
        setTranslatedObj(obj);
      } finally {
        setIsTranslating(false);
      }
    };

    translateObject();
  }, [obj, language, JSON.stringify(fields)]);

  return { translatedObj, isTranslating };
}