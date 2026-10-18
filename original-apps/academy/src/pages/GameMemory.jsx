import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAutoTranslate } from '@/components/hooks/useAutoTranslate';

function MemoryCard({ card, isFlipped, onClick, language }) {
  const { translatedText } = useAutoTranslate(card.type === 'name' && language !== 'en' ? card.value : '');
  const displayName = card.type === 'name' && language === 'en' && card.value_en ? card.value_en : (card.type === 'name' ? translatedText : '');
  
  return (
    <motion.div
      whileHover={{ scale: isFlipped ? 1 : 1.05 }}
      whileTap={{ scale: isFlipped ? 1 : 0.95 }}
      onClick={onClick}
      className="aspect-square cursor-pointer"
    >
      <div className={`relative w-full h-full transition-all duration-500 ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`} style={{ transformStyle: 'preserve-3d' }}>
        {/* Card Back */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg" style={{ backfaceVisibility: 'hidden' }}>
          <span className="text-4xl">🎴</span>
        </div>
        
        {/* Card Front */}
        <div className="absolute inset-0 bg-white rounded-xl shadow-lg flex items-center justify-center p-2 [transform:rotateY(180deg)]" style={{ backfaceVisibility: 'hidden' }}>
          {card.type === 'image' ? (
            <img src={card.value} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <p className="text-center font-medium text-sm">{displayName}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function GameMemory() {
  const { t, isRTL, language } = useLanguage();
  const [cards, setCards] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: drinkItems = [] } = useQuery({
    queryKey: ['drinkItems'],
    queryFn: () => base44.entities.DrinkItem.list(),
  });

  useEffect(() => {
    if (menuItems.length > 0 || drinkItems.length > 0) {
      initializeGame();
    }
  }, [menuItems, drinkItems]);

  const initializeGame = () => {
    const allItems = [
      ...menuItems.map(item => ({ ...item, type: 'menu' })),
      ...drinkItems.filter(d => d.category !== 'Spirits').map(item => ({ ...item, type: 'drink' }))
    ];
    const itemsWithImages = allItems.filter(item => (item.image_file || item.image_url) && item.name_he);
    const selectedItems = itemsWithImages.sort(() => Math.random() - 0.5).slice(0, 8);
    
    const gameCards = [];
    selectedItems.forEach((item, idx) => {
      gameCards.push({
        id: `img-${idx}`,
        type: 'image',
        value: item.image_file || item.image_url,
        matchId: item.id
      });
      gameCards.push({
        id: `name-${idx}`,
        type: 'name',
        value: item.name_he,
        value_en: item.name_en,
        matchId: item.id
      });
    });

    setCards(gameCards.sort(() => Math.random() - 0.5));
    setFlippedIndices([]);
    setMatchedPairs([]);
    setMoves(0);
    setGameOver(false);
  };

  const handleCardClick = (index) => {
    if (flippedIndices.length === 2 || flippedIndices.includes(index) || matchedPairs.includes(cards[index].matchId)) {
      return;
    }

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      const [first, second] = newFlipped;
      const firstCard = cards[first];
      const secondCard = cards[second];

      if (firstCard.matchId === secondCard.matchId) {
        setMatchedPairs([...matchedPairs, firstCard.matchId]);
        setFlippedIndices([]);
        
        if (matchedPairs.length + 1 === cards.length / 2) {
          setTimeout(() => setGameOver(true), 500);
        }
      } else {
        setTimeout(() => setFlippedIndices([]), 1000);
      }
    }
  };

  if (cards.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">{t('startGame')}...</div>;
  }

  if (gameOver) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center ${isRTL ? 'rtl' : ''}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('congratulations')}!</h1>
          <p className="text-2xl text-gray-700 mb-8">
            {t('finishedIn')} <span className="font-bold text-purple-600">{moves}</span> {t('moves')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={initializeGame} size="lg" className="bg-purple-600 hover:bg-purple-700">
              {t('tryAgain')}
            </Button>
            <Link to={createPageUrl('Games')}>
              <Button variant="outline" size="lg">
                {t('backToMenu')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link to={createPageUrl('Games')}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToMenu')}
            </Button>
          </Link>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{t('moves')}: {moves}</p>
            <p className="text-sm text-gray-600">{t('pairs')}: {matchedPairs.length} / {cards.length / 2}</p>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-4">
          {cards.map((card, index) => {
            const isFlipped = flippedIndices.includes(index) || matchedPairs.includes(card.matchId);
            
            return (
              <MemoryCard
                key={card.id}
                card={card}
                isFlipped={isFlipped}
                onClick={() => handleCardClick(index)}
                language={language}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}