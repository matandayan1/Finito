import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function GlossaryModal({ text }) {
  const { t } = useLanguage();
  const [selectedTerm, setSelectedTerm] = useState(null);

  const { data: glossary = [] } = useQuery({
    queryKey: ['glossary'],
    queryFn: () => base44.entities.Glossary.list(),
  });

  const renderTextWithLinks = (content) => {
    if (!content || !glossary || glossary.length === 0) return content;
    
    // Sort terms by length (longest first) to match longer terms first
    const sortedTerms = [...glossary].sort((a, b) => {
      const maxA = Math.max(a.term.length, a.he.length);
      const maxB = Math.max(b.term.length, b.he.length);
      return maxB - maxA;
    });
    
    let segments = [{ text: content, isTerm: false }];
    
    sortedTerms.forEach(term => {
      const newSegments = [];
      segments.forEach(segment => {
        if (segment.isTerm) {
          newSegments.push(segment);
          return;
        }
        
        // Try both English and Hebrew terms
        const patterns = [term.term, term.he].filter(Boolean);
        let text = segment.text;
        let hasMatch = false;
        
        patterns.forEach(pattern => {
          const regex = new RegExp(`(${pattern})`, 'gi');
          const parts = text.split(regex);
          
          if (parts.length > 1) {
            hasMatch = true;
            parts.forEach(part => {
              if (part && regex.test(part)) {
                newSegments.push({ text: part, isTerm: true, term });
              } else if (part) {
                newSegments.push({ text: part, isTerm: false });
              }
            });
          }
        });
        
        if (!hasMatch) {
          newSegments.push(segment);
        }
      });
      segments = newSegments;
    });

    return segments.map((segment, idx) => {
      if (segment.isTerm) {
        return (
          <button
            key={idx}
            onClick={() => setSelectedTerm(segment.term)}
            className="text-amber-700 underline hover:text-amber-800 font-medium cursor-pointer"
          >
            {segment.text}
          </button>
        );
      }
      return <span key={idx}>{segment.text}</span>;
    });
  };

  return (
    <>
      {renderTextWithLinks(text)}
      
      {selectedTerm && (
        <Dialog open={!!selectedTerm} onOpenChange={() => setSelectedTerm(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedTerm.term} / {selectedTerm.he}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-700 mb-1">{t('meaning')}:</p>
                <p className="text-gray-600">{selectedTerm.meaning}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">{t('howToExplain')}:</p>
                <p className="text-gray-600">{selectedTerm.how_to_explain}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}