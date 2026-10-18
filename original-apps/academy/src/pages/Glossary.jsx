import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';

function GlossaryCard({ term }) {
  const { t } = useLanguage();
  return (
    <Card className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-neutral-900">
          {term.term} / {term.he}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium text-neutral-700 mb-1.5 text-sm">{t('meaning')}:</p>
          <p className="text-neutral-600 leading-relaxed">{term.meaning}</p>
        </div>
        <div>
          <p className="font-medium text-neutral-700 mb-1.5 text-sm">{t('howToExplain')}:</p>
          <p className="text-neutral-600 leading-relaxed">{term.how_to_explain}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const translationCache = {};

export default function Glossary() {
  const { t, isRTL, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [translatedGlossary, setTranslatedGlossary] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const abortRef = useRef(false);

  const { data: glossary = [], isLoading } = useQuery({
    queryKey: ['glossary'],
    queryFn: () => base44.entities.Glossary.list(),
  });

  useEffect(() => {
    if (!glossary.length) return;

    if (language === 'he') {
      setTranslatedGlossary(glossary);
      return;
    }

    const cacheKey = language;
    if (translationCache[cacheKey]) {
      setTranslatedGlossary(translationCache[cacheKey]);
      return;
    }

    abortRef.current = false;
    setIsTranslating(true);

    const translate = async () => {
      const languageNames = { en: 'English', fr: 'French', ja: 'Japanese', ru: 'Russian' };
      const targetLanguage = languageNames[language] || 'English';

      const textsToTranslate = glossary.map(term => ({
        meaning: term.meaning,
        how_to_explain: term.how_to_explain,
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Translate the following JSON array of Hebrew glossary entries to ${targetLanguage}. Return ONLY valid JSON array, same structure, translating only "meaning" and "how_to_explain" fields:\n\n${JSON.stringify(textsToTranslate)}`,
        response_json_schema: {
          type: 'object',
          properties: {
            translations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  meaning: { type: 'string' },
                  how_to_explain: { type: 'string' },
                },
              },
            },
          },
        },
      });

      if (abortRef.current) return;

      const translations = result?.translations || [];
      const translated = glossary.map((term, i) => ({
        ...term,
        meaning: translations[i]?.meaning || term.meaning,
        how_to_explain: translations[i]?.how_to_explain || term.how_to_explain,
      }));

      translationCache[cacheKey] = translated;
      setTranslatedGlossary(translated);
      setIsTranslating(false);
    };

    translate().catch(() => {
      if (!abortRef.current) {
        setTranslatedGlossary(glossary);
        setIsTranslating(false);
      }
    });

    return () => { abortRef.current = true; };
  }, [glossary, language]);

  const displayGlossary = language === 'he' ? glossary : translatedGlossary;

  const filteredTerms = displayGlossary.filter(term =>
    term.term?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    term.he?.includes(searchTerm) ||
    term.meaning?.includes(searchTerm)
  );

  return (
    <div className={`min-h-screen bg-neutral-50 py-12 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-light text-neutral-900 mb-10 text-center tracking-wide">
          {t('glossary')}
        </h1>

        <div className="mb-8 relative">
          <Input
            type="text"
            placeholder={t('search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${isRTL ? 'pr-12' : 'pl-12'} h-12 border-neutral-300 focus:border-neutral-500 transition-all rounded-sm`}
          />
          <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 pointer-events-none`} />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-neutral-500">{t('loading')}...</div>
        ) : isTranslating ? (
          <div className="text-center py-12 text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('loading')}...
          </div>
        ) : filteredTerms.length > 0 ? (
          <div className="space-y-5">
            {filteredTerms.map(term => (
              <GlossaryCard key={term.id} term={term} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500">
            {t('noResults')}
          </div>
        )}
      </div>
    </div>
  );
}