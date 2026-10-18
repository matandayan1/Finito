import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Trophy, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAutoTranslateObject, useAutoTranslate } from '@/components/hooks/useAutoTranslate';

function OptionButton({ item, isSelected, showAsCorrect, showAsWrong, onClick, disabled, selectedName }) {
  const { language } = useLanguage();
  const { translatedText } = useAutoTranslate(item.name_he);
  const displayName = language === 'en' && item.name_en ? item.name_en : (language === 'he' ? item.name_he : translatedText);
  
  return (
    <motion.button
      whileHover={{ scale: !selectedName ? 1.05 : 1 }}
      whileTap={{ scale: !selectedName ? 0.95 : 1 }}
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded-lg border-2 font-medium transition-all relative ${
        showAsCorrect
          ? 'bg-green-100 border-green-500 text-green-800'
          : showAsWrong
            ? 'bg-red-100 border-red-500 text-red-800'
            : 'bg-white border-gray-200 hover:border-blue-400'
      }`}
    >
      {displayName}
      {showAsCorrect && (
        <CheckCircle2 className="absolute top-2 left-2 w-5 h-5 text-green-600" />
      )}
      {showAsWrong && (
        <XCircle className="absolute top-2 left-2 w-5 h-5 text-red-600" />
      )}
    </motion.button>
  );
}

export default function GameDishMatch() {
  const { t, isRTL, language } = useLanguage();
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedName, setSelectedName] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [gameItems, setGameItems] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: drinkItems = [] } = useQuery({
    queryKey: ['drinkItems'],
    queryFn: () => base44.entities.DrinkItem.list(),
  });

  const currentItem = gameItems[currentRound];
  const { translatedObj: translatedItem } = useAutoTranslateObject(currentItem, ['name_he', 'short_story']);

  useEffect(() => {
    if (menuItems.length > 0 || drinkItems.length > 0) {
      const allItems = [
        ...menuItems.map(item => ({ ...item, type: 'menu' })),
        ...drinkItems.filter(d => d.category !== 'Spirits').map(item => ({ ...item, type: 'drink' }))
      ];
      const itemsWithImages = allItems.filter(item => item.image_file || item.image_url);
      const shuffled = itemsWithImages.sort(() => Math.random() - 0.5).slice(0, 10);
      setGameItems(shuffled);
    }
  }, [menuItems, drinkItems]);

  useEffect(() => {
    if (currentItem) {
      const sameCategoryItems = gameItems.filter(item => 
        item.category === currentItem.category && item.id !== currentItem.id
      );
      const wrongItems = sameCategoryItems.length >= 2 
        ? sameCategoryItems.sort(() => Math.random() - 0.5).slice(0, 2)
        : gameItems.filter(item => item.id !== currentItem.id).sort(() => Math.random() - 0.5).slice(0, 2);
      const optionItems = [currentItem, ...wrongItems].sort(() => Math.random() - 0.5);
      setCurrentOptions(optionItems);
    }
  }, [currentRound, gameItems]);

  const handleSelectName = (itemId, isCorrect) => {
    setSelectedName(itemId);
    if (isCorrect) {
      setFeedback({ type: 'correct', message: translatedItem?.short_story || currentItem?.short_story || t('congratulations') });
      setScore(score + 10);
    } else {
      setFeedback({ type: 'incorrect', message: t('correct') });
    }
  };

  const handleNext = () => {
    if (currentRound + 1 < gameItems.length) {
      setCurrentRound(currentRound + 1);
      setSelectedName(null);
      setFeedback(null);
    } else {
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    setCurrentRound(0);
    setScore(0);
    setSelectedName(null);
    setFeedback(null);
    setGameOver(false);
    const allItems = [
      ...menuItems.map(item => ({ ...item, type: 'menu' })),
      ...drinkItems.filter(d => d.category !== 'Spirits').map(item => ({ ...item, type: 'drink' }))
    ];
    const shuffled = allItems.filter(item => item.image_file || item.image_url).sort(() => Math.random() - 0.5).slice(0, 10);
    setGameItems(shuffled);
  };

  if (gameItems.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">{t('startGame')}...</div>;
  }

  if (gameOver) {
    const percentage = (score / (gameItems.length * 10)) * 100;
    const isPassed = percentage >= 80;
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${isPassed ? 'from-green-50 to-emerald-50' : 'from-orange-50 to-red-50'} flex items-center justify-center ${isRTL ? 'rtl' : ''}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Trophy className={`w-24 h-24 ${isPassed ? 'text-yellow-500' : 'text-orange-400'} mx-auto mb-6`} />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {isPassed ? t('congratulations') : t('tryAgain')}!
          </h1>
          <p className="text-2xl text-gray-700 mb-8">
            {t('yourScore')}: <span className={`font-bold ${isPassed ? 'text-green-600' : 'text-orange-600'}`}>{score}</span> / {gameItems.length * 10}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRestart} size="lg" className={`${isPassed ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
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

  const imageSrc = currentItem?.image_file || currentItem?.image_url;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link to={createPageUrl('Games')}>
            <Button variant="ghost">
              {isRTL ? <ArrowLeft className="w-4 h-4 ml-2" /> : <ArrowLeft className="w-4 h-4 mr-2" />}
              {t('backToMenu')}
            </Button>
          </Link>
          <div className="text-center">
            <p className="text-sm text-gray-600">{t('questionNumber')} {currentRound + 1} {t('of')} {gameItems.length}</p>
            <p className="text-2xl font-bold text-blue-600">{t('score')}: {score}</p>
          </div>
        </div>

        {/* Game Area */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <h2 className="text-2xl font-light text-center mb-6">{t('dragCorrectName')}</h2>
            
            {/* Dish Image */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-8"
            >
              <img 
                src={imageSrc}
                alt="Dish"
                className="w-full max-w-md mx-auto rounded-xl shadow-lg aspect-video object-cover"
              />
            </motion.div>

            {/* Name Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {currentOptions.map((item, idx) => {
                const isThisCorrect = item.id === currentItem.id;
                const isSelected = selectedName === item.id;
                const showAsCorrect = selectedName && isThisCorrect;
                const showAsWrong = isSelected && !isThisCorrect;
                
                return (
                  <OptionButton
                    key={idx}
                    item={item}
                    isSelected={isSelected}
                    showAsCorrect={showAsCorrect}
                    showAsWrong={showAsWrong}
                    onClick={() => !selectedName && handleSelectName(item.id, isThisCorrect)}
                    disabled={!!selectedName}
                    selectedName={selectedName}
                  />
                );
              })}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-4 rounded-lg mb-4 ${
                    feedback.type === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {feedback.type === 'correct' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    )}
                    <p className={`${feedback.type === 'correct' ? 'text-green-800' : 'text-red-800'}`}>
                      {feedback.message}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next Button */}
            {selectedName && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <Button onClick={handleNext} size="lg" className="bg-blue-600 hover:bg-blue-700">
                  {currentRound + 1 < gameItems.length ? t('next') : t('finish')}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}